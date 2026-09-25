-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONSULTANT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationOTP" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "EmailVerificationOTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT,
    "industry" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "targetUsers" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERY',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'discovery',
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "structuredContent" TEXT,
    "suggestedAction" TEXT,
    "clientRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessAnalysis" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "futureState" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "painPoints" TEXT NOT NULL,
    "stakeholders" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "gaps" TEXT NOT NULL,
    "processIssues" TEXT NOT NULL,
    "automationOpportunities" TEXT NOT NULL,
    "digitalMaturityScore" INTEGER NOT NULL DEFAULT 65,
    "improvementOpportunities" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "executiveSummary" TEXT,
    "assessmentScores" TEXT,
    "strategicGoals" TEXT,
    "operationalPainPoints" TEXT,
    "requirementsData" TEXT,
    "openQuestions" TEXT,
    "assumptions" TEXT,
    "recommendations" TEXT,
    "evidenceReferences" TEXT,
    "currentOperatingContext" TEXT,
    "futureOperatingState" TEXT,
    "validationSummary" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solution" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "businessValue" TEXT NOT NULL,
    "keyCapabilities" TEXT NOT NULL,
    "automationOpps" TEXT NOT NULL,
    "aiOpps" TEXT NOT NULL,
    "techStack" TEXT NOT NULL,
    "implementationApproach" TEXT NOT NULL,
    "risks" TEXT NOT NULL,
    "assumptions" TEXT NOT NULL,
    "dependencies" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL DEFAULT 'OPTION_B',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceAnalysisId" TEXT,
    "sourceAnalysisVersion" INTEGER,
    "sourceContextHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Architecture" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Solution Architecture',
    "highLevelDesign" TEXT NOT NULL,
    "lowLevelDesign" TEXT NOT NULL,
    "integrationArch" TEXT NOT NULL,
    "infrastructureArch" TEXT NOT NULL,
    "securityArch" TEXT NOT NULL,
    "deploymentArch" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceSolutionId" TEXT,
    "sourceSolutionOptionId" TEXT,
    "sourceContextHash" TEXT,
    "traceabilityJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Architecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureNode" (
    "id" TEXT NOT NULL,
    "architectureId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "tech" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "purpose" TEXT,
    "source" TEXT,
    "confidence" DOUBLE PRECISION,
    "requirementIds" TEXT,
    "capabilityIds" TEXT,
    "dependencies" TEXT,
    "validationStatus" TEXT,
    "classification" TEXT,

    CONSTRAINT "ArchitectureNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureEdge" (
    "id" TEXT NOT NULL,
    "architectureId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT,
    "protocol" TEXT,
    "relationship" TEXT,
    "direction" TEXT,
    "description" TEXT,
    "requirementIds" TEXT,

    CONSTRAINT "ArchitectureEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessModel" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Target Process Workflow',
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'WORKFLOW',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceArchitectureId" TEXT,
    "sourceArchitectureVersion" INTEGER,
    "sourceSolutionOptionId" TEXT,
    "sourceContextHash" TEXT,
    "transitionsJson" TEXT,
    "decisionRulesJson" TEXT,
    "validationStateJson" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessNode" (
    "id" TEXT NOT NULL,
    "processModelId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "condition" TEXT,
    "nextStepId" TEXT,
    "system" TEXT,
    "input" TEXT,
    "action" TEXT,
    "output" TEXT,
    "aiCapability" TEXT,
    "confidence" DOUBLE PRECISION,
    "sla" TEXT,
    "retryPolicy" TEXT,
    "failureHandling" TEXT,
    "requirementIds" TEXT,
    "architectureNodeId" TEXT,
    "classification" TEXT DEFAULT 'AI_PROPOSED',
    "timeoutPolicy" TEXT,
    "escalationPolicy" TEXT,
    "preconditions" TEXT,
    "postconditions" TEXT,
    "validationStatus" TEXT DEFAULT 'PROPOSED',
    "sourceContext" TEXT,

    CONSTRAINT "ProcessNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UXDesign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'UX Solution Wireframes',
    "screens" TEXT NOT NULL,
    "designTokens" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UXDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseDesign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Relational Data Model & ERD',
    "entities" TEXT NOT NULL,
    "relations" TEXT NOT NULL,
    "sqlSchema" TEXT NOT NULL,
    "prismaSchema" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiDesign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Enterprise REST API Specifications',
    "baseUrl" TEXT NOT NULL DEFAULT '/api/v1',
    "authType" TEXT NOT NULL DEFAULT 'Bearer JWT',
    "endpoints" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImplementationPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Transformation Implementation Plan',
    "phases" TEXT NOT NULL,
    "estimatedDurationWeeks" INTEGER NOT NULL DEFAULT 12,
    "estimatedCost" TEXT NOT NULL DEFAULT '$180,000 - $240,000',
    "methodology" TEXT NOT NULL DEFAULT 'Agile / Scrum (2-week Sprints)',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImplementationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "phaseName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedRole" TEXT NOT NULL,
    "durationWeeks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sprint" TEXT NOT NULL DEFAULT 'Sprint 1',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dependencies" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "sourceRequirement" TEXT,
    "riskReason" TEXT,
    "riskMitigation" TEXT,
    "isUserEdited" BOOLEAN NOT NULL DEFAULT false,
    "taskOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "artifactId" TEXT,
    "artifactName" TEXT,
    "versionNumber" INTEGER,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "artifactId" TEXT,
    "artifactName" TEXT,
    "versionId" TEXT,
    "versionNumber" INTEGER,
    "stage" TEXT NOT NULL DEFAULT 'REVIEW',
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "organizationId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "details" TEXT NOT NULL,
    "artifactType" TEXT,
    "artifactName" TEXT,
    "versionNumber" INTEGER,
    "resultingStatus" TEXT,
    "beforeState" TEXT,
    "afterState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactVersion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotData" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'COMPLETE',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "version" TEXT,
    "createdByName" TEXT,
    "errorReason" TEXT,
    "downloadUrl" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'PLATFORM',
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "configJson" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "errorReason" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAlert" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "twilioCallSid" TEXT,
    "twilioStreamSid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "startedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "EmailVerificationOTP_email_idx" ON "EmailVerificationOTP"("email");

-- CreateIndex
CREATE INDEX "EmailVerificationOTP_email_verifiedAt_createdAt_idx" ON "EmailVerificationOTP"("email", "verifiedAt", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationOTP_email_purpose_verifiedAt_createdAt_idx" ON "EmailVerificationOTP"("email", "purpose", "verifiedAt", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationOTP_userId_idx" ON "EmailVerificationOTP"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationOTP_expiresAt_idx" ON "EmailVerificationOTP"("expiresAt");

-- CreateIndex
CREATE INDEX "Workspace_organizationId_createdAt_idx" ON "Workspace"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Workspace_createdById_createdAt_idx" ON "Workspace"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Workspace_status_idx" ON "Workspace"("status");

-- CreateIndex
CREATE INDEX "Document_workspaceId_createdAt_idx" ON "Document"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_workspaceId_status_idx" ON "Document"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_stage_updatedAt_idx" ON "Conversation"("workspaceId", "stage", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_stage_lastMessageAt_idx" ON "Conversation"("workspaceId", "stage", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_clientRequestId_idx" ON "Message"("clientRequestId");

-- CreateIndex
CREATE INDEX "BusinessAnalysis_workspaceId_createdAt_idx" ON "BusinessAnalysis"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessAnalysis_workspaceId_status_idx" ON "BusinessAnalysis"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Solution_workspaceId_createdAt_idx" ON "Solution"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Architecture_workspaceId_createdAt_idx" ON "Architecture"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ArchitectureNode_architectureId_idx" ON "ArchitectureNode"("architectureId");

-- CreateIndex
CREATE INDEX "ArchitectureEdge_architectureId_idx" ON "ArchitectureEdge"("architectureId");

-- CreateIndex
CREATE INDEX "ProcessModel_workspaceId_createdAt_idx" ON "ProcessModel"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessNode_processModelId_stepOrder_idx" ON "ProcessNode"("processModelId", "stepOrder");

-- CreateIndex
CREATE INDEX "UXDesign_workspaceId_createdAt_idx" ON "UXDesign"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "DatabaseDesign_workspaceId_createdAt_idx" ON "DatabaseDesign"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiDesign_workspaceId_createdAt_idx" ON "ApiDesign"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ImplementationPlan_workspaceId_createdAt_idx" ON "ImplementationPlan"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_planId_taskOrder_idx" ON "Task"("planId", "taskOrder");

-- CreateIndex
CREATE INDEX "Task_planId_status_idx" ON "Task"("planId", "status");

-- CreateIndex
CREATE INDEX "Comment_workspaceId_artifactType_createdAt_idx" ON "Comment"("workspaceId", "artifactType", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Approval_workspaceId_status_idx" ON "Approval"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_workspaceId_artifactType_versionNumber_stage_userI_key" ON "Approval"("workspaceId", "artifactType", "versionNumber", "stage", "userId");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON "ActivityLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_createdAt_idx" ON "ActivityLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_resource_createdAt_idx" ON "ActivityLog"("resource", "createdAt");

-- CreateIndex
CREATE INDEX "ArtifactVersion_workspaceId_artifactType_versionNumber_idx" ON "ArtifactVersion"("workspaceId", "artifactType", "versionNumber");

-- CreateIndex
CREATE INDEX "ArtifactVersion_workspaceId_createdAt_idx" ON "ArtifactVersion"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportJob_workspaceId_createdAt_idx" ON "ExportJob"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "AdminAlert_isRead_createdAt_idx" ON "AdminAlert"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAlert_severity_createdAt_idx" ON "AdminAlert"("severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "voice_sessions_twilioCallSid_key" ON "voice_sessions"("twilioCallSid");

-- CreateIndex
CREATE INDEX "voice_sessions_userId_createdAt_idx" ON "voice_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "voice_sessions_twilioCallSid_idx" ON "voice_sessions"("twilioCallSid");

-- CreateIndex
CREATE INDEX "voice_sessions_status_idx" ON "voice_sessions"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationOTP" ADD CONSTRAINT "EmailVerificationOTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAnalysis" ADD CONSTRAINT "BusinessAnalysis_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Architecture" ADD CONSTRAINT "Architecture_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureNode" ADD CONSTRAINT "ArchitectureNode_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureEdge" ADD CONSTRAINT "ArchitectureEdge_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessModel" ADD CONSTRAINT "ProcessModel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessNode" ADD CONSTRAINT "ProcessNode_processModelId_fkey" FOREIGN KEY ("processModelId") REFERENCES "ProcessModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UXDesign" ADD CONSTRAINT "UXDesign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseDesign" ADD CONSTRAINT "DatabaseDesign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiDesign" ADD CONSTRAINT "ApiDesign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImplementationPlan" ADD CONSTRAINT "ImplementationPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ImplementationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

