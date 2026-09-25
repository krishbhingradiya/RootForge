import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { upload, uploadDir } from '../middleware/upload.js';
import { extractTextFromFile } from '../utils/textExtractor.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  handleRouteError
} from '../services/authorization.service.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// List documents for workspace (tenant-scoped)
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const documents = await prisma.document.findMany({
      where: { workspaceId: req.params.id },
      select: {
        id: true,
        workspaceId: true,
        filename: true,
        originalName: true,
        fileType: true,
        fileSize: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ documents });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve documents.');
  }
});

// Get document details & extracted text (tenant-scoped)
router.get('/:id/documents/:docId', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const document = await prisma.document.findUnique({
      where: { id: req.params.docId }
    });

    if (!document || document.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    res.json({ document });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve document details.');
  }
});

// Upload and process document (tenant-scoped + write permission)
router.post('/:id/documents', authenticate, upload.single('file'), async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    
    // Create initial record in PROCESSING state
    const document = await prisma.document.create({
      data: {
        workspaceId: req.params.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: ext || 'UNKNOWN',
        fileSize: req.file.size,
        status: 'PROCESSING'
      }
    });

    // Run text extraction
    const extraction = await extractTextFromFile(req.file.path, req.file.originalname);
    
    const finalStatus = extraction.success ? 'ANALYZED' : 'FAILED';
    const finalContent = extraction.success 
      ? extraction.text 
      : `[EXTRACTION_FAILED]: ${extraction.error || 'Failed to parse file content'}`;

    const updatedDoc = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: finalStatus,
        extractedText: finalContent
      }
    });

    // Flag existing analysis as STALE if present so user is informed to regenerate
    await prisma.businessAnalysis.updateMany({
      where: { workspaceId: req.params.id },
      data: { status: 'STALE' }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPLOADED',
        details: `Uploaded document "${req.file.originalname}" (${(req.file.size / 1024).toFixed(1)} KB) — Status: ${finalStatus}`
      }
    });

    res.status(201).json({
      document: updatedDoc,
      preview: extraction.preview,
      statusLabel: finalStatus === 'ANALYZED' ? 'Processed & Analyzed' : 'Extraction Failed',
      success: extraction.success
    });
  } catch (error) {
    handleRouteError(res, error, 'Document upload failed.');
  }
});

// Reprocess an existing document (tenant-scoped + write permission)
router.post('/:id/documents/:docId/reprocess', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const doc = await prisma.document.findUnique({
      where: { id: req.params.docId }
    });

    if (!doc || doc.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const filePath = path.resolve(uploadDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: 'FAILED',
          extractedText: '[EXTRACTION_FAILED]: Source file missing from disk'
        }
      });
      return res.status(400).json({ error: 'Source file does not exist on disk to reprocess.' });
    }

    // Set to PROCESSING
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: 'PROCESSING' }
    });

    // Re-extract
    const extraction = await extractTextFromFile(filePath, doc.originalName);
    const finalStatus = extraction.success ? 'ANALYZED' : 'FAILED';
    const finalContent = extraction.success 
      ? extraction.text 
      : `[EXTRACTION_FAILED]: ${extraction.error || 'Failed to reprocess file'}`;

    const reprocessedDoc = await prisma.document.update({
      where: { id: doc.id },
      data: {
        status: finalStatus,
        extractedText: finalContent
      }
    });

    // Flag existing analysis as STALE upon document reprocess
    await prisma.businessAnalysis.updateMany({
      where: { workspaceId: req.params.id },
      data: { status: 'STALE' }
    });

    res.json({
      document: reprocessedDoc,
      preview: extraction.preview,
      success: extraction.success
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to reprocess document.');
  }
});

// Delete document (tenant-scoped + subresource ownership check)
router.delete('/:id/documents/:docId', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const doc = await prisma.document.findUnique({
      where: { id: req.params.docId }
    });
    if (!doc || doc.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Attempt to remove physical file from disk
    try {
      const filePath = path.resolve(uploadDir, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.warn('Physical file deletion warning:', fsErr.message);
    }

    await prisma.document.delete({ where: { id: req.params.docId } });

    // Flag existing analysis as STALE upon document deletion
    await prisma.businessAnalysis.updateMany({
      where: { workspaceId: req.params.id },
      data: { status: 'STALE' }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'DELETED',
        details: `Deleted document "${doc.originalName}"`
      }
    });

    res.json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete document.');
  }
});

export default router;
