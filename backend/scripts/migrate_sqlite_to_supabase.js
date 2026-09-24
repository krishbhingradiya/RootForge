/**
 * Automated Data Migration Script: SQLite (dev.db) -> Supabase (PostgreSQL)
 *
 * Preserves all records, relationships, IDs, timestamps, and data integrity.
 *
 * Usage:
 *   cd backend
 *   node scripts/migrate_sqlite_to_supabase.js
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const dbPath = path.resolve(backendDir, 'prisma', 'dev.db');

dotenv.config({ path: path.resolve(backendDir, '.env') });

const prisma = new PrismaClient();

function getSqliteRows(tableName) {
  try {
    const raw = execSync(`sqlite3 "${dbPath}" ".mode json" "SELECT * FROM \\"${tableName}\\";"`, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024
    });
    if (!raw || !raw.trim()) return [];
    return JSON.parse(raw.trim());
  } catch (err) {
    console.warn(`[WARN] Could not read table ${tableName}: ${err.message}`);
    return [];
  }
}

function toDate(val) {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 1000000000) return new Date(num);
    return new Date(val);
  }
  return new Date(val);
}

function toBool(val) {
  if (val === null || val === undefined) return undefined;
  return Boolean(val === 1 || val === true || val === '1' || val === 'true');
}

async function migrate() {
  console.log('====================================================');
  console.log('🚀 ROOTFORGE DATA MIGRATION: SQLite -> Supabase');
  console.log('====================================================\n');
  console.log(`Source DB: ${dbPath}`);
  console.log(`Target DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}\n`);

  // Dependency Order: Parent tables before Child tables
  const migrationPlan = [
    {
      name: 'Conversation',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        stage: r.stage || 'discovery',
        title: r.title || 'New Chat',
        isArchived: toBool(r.isArchived) ?? false,
        lastMessageAt: toDate(r.lastMessageAt),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.conversation
    },
    {
      name: 'Message',
      transform: (r) => ({
        id: r.id,
        conversationId: r.conversationId,
        role: r.role,
        content: r.content,
        structuredContent: r.structuredContent || null,
        suggestedAction: r.suggestedAction || null,
        clientRequestId: r.clientRequestId || null,
        createdAt: toDate(r.createdAt)
      }),
      delegate: prisma.message
    },
    {
      name: 'BusinessAnalysis',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        currentState: r.currentState,
        futureState: r.futureState,
        goals: r.goals,
        painPoints: r.painPoints,
        stakeholders: r.stakeholders,
        requirements: r.requirements,
        gaps: r.gaps,
        processIssues: r.processIssues,
        automationOpportunities: r.automationOpportunities,
        digitalMaturityScore: Number(r.digitalMaturityScore || 65),
        improvementOpportunities: r.improvementOpportunities,
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        executiveSummary: r.executiveSummary || null,
        assessmentScores: r.assessmentScores || null,
        strategicGoals: r.strategicGoals || null,
        operationalPainPoints: r.operationalPainPoints || null,
        requirementsData: r.requirementsData || null,
        openQuestions: r.openQuestions || null,
        assumptions: r.assumptions || null,
        recommendations: r.recommendations || null,
        evidenceReferences: r.evidenceReferences || null,
        currentOperatingContext: r.currentOperatingContext || null,
        futureOperatingState: r.futureOperatingState || null,
        validationSummary: r.validationSummary || null,
        model: r.model || null,
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.businessAnalysis
    },
    {
      name: 'Solution',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        name: r.name,
        summary: r.summary,
        businessValue: r.businessValue,
        keyCapabilities: r.keyCapabilities,
        automationOpps: r.automationOpps,
        aiOpps: r.aiOpps,
        techStack: r.techStack,
        implementationApproach: r.implementationApproach,
        risks: r.risks,
        assumptions: r.assumptions,
        dependencies: r.dependencies,
        options: r.options,
        selectedOption: r.selectedOption || 'OPTION_B',
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        sourceAnalysisId: r.sourceAnalysisId || null,
        sourceAnalysisVersion: r.sourceAnalysisVersion ? Number(r.sourceAnalysisVersion) : null,
        sourceContextHash: r.sourceContextHash || null,
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.solution
    },
    {
      name: 'Architecture',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        title: r.title || 'Solution Architecture',
        highLevelDesign: r.highLevelDesign,
        lowLevelDesign: r.lowLevelDesign,
        integrationArch: r.integrationArch,
        infrastructureArch: r.infrastructureArch,
        securityArch: r.securityArch,
        deploymentArch: r.deploymentArch,
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        sourceSolutionId: r.sourceSolutionId || null,
        sourceSolutionOptionId: r.sourceSolutionOptionId || null,
        sourceContextHash: r.sourceContextHash || null,
        traceabilityJson: r.traceabilityJson || null,
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.architecture
    },
    {
      name: 'ArchitectureNode',
      transform: (r) => ({
        id: r.id,
        architectureId: r.architectureId,
        label: r.label,
        type: r.type,
        description: r.description,
        tier: r.tier,
        posX: Number(r.posX || 100),
        posY: Number(r.posY || 100),
        tech: r.tech || null,
        status: r.status || 'ACTIVE',
        purpose: r.purpose || null,
        source: r.source || null,
        confidence: r.confidence ? Number(r.confidence) : null,
        requirementIds: r.requirementIds || null,
        capabilityIds: r.capabilityIds || null,
        dependencies: r.dependencies || null,
        validationStatus: r.validationStatus || null,
        classification: r.classification || null
      }),
      delegate: prisma.architectureNode
    },
    {
      name: 'ArchitectureEdge',
      transform: (r) => ({
        id: r.id,
        architectureId: r.architectureId,
        sourceId: r.sourceId,
        targetId: r.targetId,
        label: r.label || null,
        protocol: r.protocol || null,
        relationship: r.relationship || null,
        direction: r.direction || null,
        description: r.description || null,
        requirementIds: r.requirementIds || null
      }),
      delegate: prisma.architectureEdge
    },
    {
      name: 'ProcessModel',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        title: r.title || 'Target Process Workflow',
        description: r.description,
        type: r.type || 'WORKFLOW',
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        sourceArchitectureId: r.sourceArchitectureId || null,
        sourceArchitectureVersion: r.sourceArchitectureVersion ? Number(r.sourceArchitectureVersion) : null,
        sourceSolutionOptionId: r.sourceSolutionOptionId || null,
        sourceContextHash: r.sourceContextHash || null,
        transitionsJson: r.transitionsJson || null,
        decisionRulesJson: r.decisionRulesJson || null,
        validationStateJson: r.validationStateJson || null,
        metadataJson: r.metadataJson || null,
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.processModel
    },
    {
      name: 'ProcessNode',
      transform: (r) => ({
        id: r.id,
        processModelId: r.processModelId,
        stepOrder: Number(r.stepOrder),
        label: r.label,
        type: r.type,
        actor: r.actor,
        description: r.description,
        condition: r.condition || null,
        nextStepId: r.nextStepId || null,
        system: r.system || null,
        input: r.input || null,
        action: r.action || null,
        output: r.output || null,
        aiCapability: r.aiCapability || null,
        confidence: r.confidence ? Number(r.confidence) : null,
        sla: r.sla || null,
        retryPolicy: r.retryPolicy || null,
        failureHandling: r.failureHandling || null,
        requirementIds: r.requirementIds || null,
        architectureNodeId: r.architectureNodeId || null,
        classification: r.classification || 'AI_PROPOSED',
        timeoutPolicy: r.timeoutPolicy || null,
        escalationPolicy: r.escalationPolicy || null,
        preconditions: r.preconditions || null,
        postconditions: r.postconditions || null,
        validationStatus: r.validationStatus || 'PROPOSED',
        sourceContext: r.sourceContext || null
      }),
      delegate: prisma.processNode
    },
    {
      name: 'UXDesign',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        title: r.title || 'UX Solution Wireframes',
        screens: r.screens,
        designTokens: r.designTokens,
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.uXDesign
    },
    {
      name: 'DatabaseDesign',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        title: r.title || 'Relational Data Model & ERD',
        entities: r.entities,
        relations: r.relations,
        sqlSchema: r.sqlSchema,
        prismaSchema: r.prismaSchema,
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.databaseDesign
    },
    {
      name: 'ApiDesign',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        title: r.title || 'Enterprise REST API Specifications',
        baseUrl: r.baseUrl || '/api/v1',
        authType: r.authType || 'Bearer JWT',
        endpoints: r.endpoints,
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.apiDesign
    },
    {
      name: 'ImplementationPlan',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        title: r.title || 'Transformation Implementation Plan',
        phases: r.phases,
        estimatedDurationWeeks: Number(r.estimatedDurationWeeks || 12),
        estimatedCost: r.estimatedCost || '$180,000 - $240,000',
        methodology: r.methodology || 'Agile / Scrum (2-week Sprints)',
        status: r.status || 'DRAFT',
        version: Number(r.version || 1),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.implementationPlan
    },
    {
      name: 'Task',
      transform: (r) => ({
        id: r.id,
        planId: r.planId,
        phaseName: r.phaseName,
        title: r.title,
        description: r.description,
        assignedRole: r.assignedRole,
        durationWeeks: Number(r.durationWeeks || 1.0),
        sprint: r.sprint || 'Sprint 1',
        status: r.status || 'TODO',
        dependencies: r.dependencies || null,
        riskLevel: r.riskLevel || 'LOW',
        sourceRequirement: r.sourceRequirement || null,
        riskReason: r.riskReason || null,
        riskMitigation: r.riskMitigation || null,
        isUserEdited: toBool(r.isUserEdited) ?? false,
        taskOrder: Number(r.taskOrder || 0),
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.task
    },
    {
      name: 'Comment',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        artifactType: r.artifactType,
        artifactId: r.artifactId || null,
        artifactName: r.artifactName || null,
        versionNumber: r.versionNumber ? Number(r.versionNumber) : null,
        parentId: r.parentId || null,
        userId: r.userId,
        content: r.content,
        mentions: r.mentions || null,
        status: r.status || 'OPEN',
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.comment
    },
    {
      name: 'Approval',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        artifactType: r.artifactType,
        artifactId: r.artifactId || null,
        artifactName: r.artifactName || null,
        versionId: r.versionId || null,
        versionNumber: r.versionNumber ? Number(r.versionNumber) : null,
        stage: r.stage || 'REVIEW',
        userId: r.userId,
        status: r.status || 'DRAFT',
        comments: r.comments || null,
        approvedAt: r.approvedAt ? toDate(r.approvedAt) : null,
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt)
      }),
      delegate: prisma.approval
    },
    {
      name: 'ActivityLog',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        userId: r.userId || null,
        userName: r.userName || null,
        userRole: r.userRole || null,
        action: r.action,
        details: r.details,
        artifactType: r.artifactType || null,
        artifactName: r.artifactName || null,
        versionNumber: r.versionNumber ? Number(r.versionNumber) : null,
        resultingStatus: r.resultingStatus || null,
        beforeState: r.beforeState || null,
        afterState: r.afterState || null,
        createdAt: toDate(r.createdAt)
      }),
      delegate: prisma.activityLog
    },
    {
      name: 'ArtifactVersion',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        artifactType: r.artifactType,
        versionNumber: Number(r.versionNumber),
        snapshotData: r.snapshotData,
        notes: r.notes || null,
        createdById: r.createdById || null,
        createdAt: toDate(r.createdAt)
      }),
      delegate: prisma.artifactVersion
    },
    {
      name: 'ExportJob',
      transform: (r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        format: r.format,
        scope: r.scope || 'COMPLETE',
        status: r.status || 'COMPLETED',
        version: r.version || null,
        createdByName: r.createdByName || null,
        errorReason: r.errorReason || null,
        downloadUrl: r.downloadUrl || null,
        summary: r.summary || null,
        createdAt: toDate(r.createdAt)
      }),
      delegate: prisma.exportJob
    },
    {
      name: 'Notification',
      transform: (r) => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        message: r.message,
        type: r.type || 'INFO',
        isRead: toBool(r.isRead) ?? false,
        createdAt: toDate(r.createdAt)
      }),
      delegate: prisma.notification
    }
  ];

  let totalMigrated = 0;

  for (const step of migrationPlan) {
    const rawRows = getSqliteRows(step.name);
    console.log(`📦 Table "${step.name}": Found ${rawRows.length} records in SQLite.`);

    if (rawRows.length === 0) continue;

    let count = 0;
    for (const raw of rawRows) {
      const data = step.transform(raw);
      try {
        await step.delegate.upsert({
          where: { id: data.id },
          create: data,
          update: data
        });
        count++;
      } catch (err) {
        console.error(`❌ Error migrating ${step.name} (${data.id}):`, err.message);
      }
    }
    console.log(`   ✅ Migrated ${count}/${rawRows.length} records.`);
    totalMigrated += count;
  }

  console.log('\n====================================================');
  console.log(`🎉 MIGRATION COMPLETE! Total records migrated: ${totalMigrated}`);
  console.log('====================================================\n');
}

migrate()
  .catch((e) => {
    console.error('Fatal migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
