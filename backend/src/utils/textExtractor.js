import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';

/**
 * Extracts title and content paragraphs from PPTX slide XML
 */
function parseSlideXml(xmlContent) {
  const paragraphs = [];
  let title = '';

  // Extract explicit title shape if present
  const titleShapeMatch = xmlContent.match(/<p:sp>(?:(?!<\/p:sp>).)*?<p:ph[^>]*type="(?:title|ctrTitle)"(?:(?!<\/p:sp>).)*?<\/p:sp>/s);
  if (titleShapeMatch) {
    const tMatches = titleShapeMatch[0].match(/<a:t[\s>](.*?)<\/a:t>/gs);
    if (tMatches) {
      title = tMatches.map(m => m.replace(/<\/?a:t[^>]*>/g, '').trim()).filter(Boolean).join(' ');
    }
  }

  // Match all paragraphs in shape body
  const pRegex = /<a:p[\s>](.*?)<\/a:p>/gs;
  let pMatch;
  while ((pMatch = pRegex.exec(xmlContent)) !== null) {
    const pContent = pMatch[1];
    const tRegex = /<a:t[\s>](.*?)<\/a:t>/gs;
    let tMatch;
    let pText = '';
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      pText += tMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    const clean = pText.trim();
    if (clean) {
      paragraphs.push(clean);
    }
  }

  if (!title && paragraphs.length > 0) {
    title = paragraphs[0];
  }

  return { title: title || 'Untitled Slide', paragraphs };
}

/**
 * Extracts slide-delimited text from a PPTX file
 */
async function extractPptxText(filePath) {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();

  // Locate all slide XML entries and sort numerically (slide1, slide2, ...)
  const slideEntries = zipEntries
    .filter(entry => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
    .sort((a, b) => {
      const matchA = a.entryName.match(/slide(\d+)\.xml/i);
      const matchB = b.entryName.match(/slide(\d+)\.xml/i);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });

  if (slideEntries.length === 0) {
    throw new Error('No presentation slides found in PPTX file');
  }

  const slideOutputs = [];

  slideEntries.forEach((entry, idx) => {
    const slideNumber = idx + 1;
    const xml = entry.getData().toString('utf8');
    const { title, paragraphs } = parseSlideXml(xml);

    // Exclude title from content bullets if duplicate
    const contentBullets = paragraphs.filter(p => p !== title);

    let slideText = `Slide ${slideNumber}:\nTitle:\n${title}`;
    if (contentBullets.length > 0) {
      slideText += `\n\nContent:\n${contentBullets.map(b => `- ${b}`).join('\n')}`;
    }

    // Look for speaker notes: ppt/notesSlides/notesSlide{slideNumber}.xml
    const notesEntry = zipEntries.find(e => 
      e.entryName.toLowerCase() === `ppt/notesslides/notesslide${slideNumber}.xml`
    );
    if (notesEntry) {
      const notesXml = notesEntry.getData().toString('utf8');
      const { paragraphs: notesParagraphs } = parseSlideXml(notesXml);
      if (notesParagraphs.length > 0) {
        slideText += `\n\nNotes:\n${notesParagraphs.join(' ')}`;
      }
    }

    slideOutputs.push(slideText);
  });

  return slideOutputs.join('\n\n');
}

/**
 * Comprehensive text extraction utility supporting:
 * - PDF (multi-page text, whitespace cleanup)
 * - DOCX (headings, paragraphs, tables via mammoth)
 * - PPTX (slides, titles, content bullets, notes via adm-zip)
 * - TXT / MD / JSON / CSV / SOP / BRD (UTF-8 text)
 *
 * @param {string} filePath - Absolute path to uploaded file
 * @param {string} originalName - Original filename with extension
 * @returns {Promise<{ success: boolean, text: string|null, preview: string, error?: string, pageCount?: number }>}
 */
export const extractTextFromFile = async (filePath, originalName, fallbackName) => {
  let name = (typeof fallbackName === 'string' && fallbackName) ? fallbackName : originalName;
  if (!name || !path.extname(name)) {
    name = path.basename(filePath);
  }
  const ext = path.extname(name).toLowerCase();

  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'File does not exist on disk',
        text: null,
        preview: 'Extraction failed: file missing'
      };
    }

    // 1. Text and delimited formats
    if (['.txt', '.md', '.json', '.csv', '.rtf', '.sop', '.brd'].includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const trimmed = content.trim();
      return {
        success: true,
        text: trimmed,
        preview: trimmed.slice(0, 300) || 'Empty text document'
      };
    }

    // 2. PDF Documents
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      if (dataBuffer.length === 0) {
        return {
          success: false,
          error: 'Empty PDF file (0 bytes)',
          text: null,
          preview: 'Empty PDF document'
        };
      }
      const pdfData = await pdfParse(new Uint8Array(dataBuffer));
      const extracted = (pdfData.text || '').replace(/\r\n/g, '\n').trim();
      if (!extracted) {
        return {
          success: true,
          text: 'PDF processed successfully (no readable text layer found).',
          preview: `PDF with ${pdfData.numpages || 1} page(s), no text layer.`,
          pageCount: pdfData.numpages || 1
        };
      }
      return {
        success: true,
        text: extracted,
        preview: extracted.slice(0, 300),
        pageCount: pdfData.numpages || 1
      };
    }

    // 3. Word Documents (.docx, .doc)
    if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      const extracted = (result.value || '').trim();
      if (!extracted && result.messages && result.messages.length > 0) {
        const msg = result.messages.map(m => m.message).join('; ');
        return {
          success: false,
          error: `DOCX extraction warning: ${msg}`,
          text: null,
          preview: 'DOCX document could not be extracted'
        };
      }
      return {
        success: true,
        text: extracted || 'Empty DOCX document',
        preview: extracted.slice(0, 300) || 'DOCX document processed'
      };
    }

    // 4. PowerPoint Presentations (.pptx, .ppt)
    if (ext === '.pptx' || ext === '.ppt') {
      const extracted = await extractPptxText(filePath);
      return {
        success: true,
        text: extracted.trim(),
        preview: extracted.slice(0, 300)
      };
    }

    return {
      success: false,
      error: `Unsupported document format: ${ext}`,
      text: null,
      preview: `Unsupported format (${ext})`
    };
  } catch (error) {
    console.error(`Error extracting text from ${originalName}:`, error.message);
    return {
      success: false,
      error: error.message || 'Unknown extraction error occurred',
      text: null,
      preview: `Extraction failed: ${error.message}`
    };
  }
};
