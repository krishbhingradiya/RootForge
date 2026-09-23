import { renderExecutiveHtmlReport } from './executivePdfRenderer.js';
import { generateExecutivePptx } from './executivePptxGenerator.js';

/**
 * Generate 100% valid, structured GitHub-Flavored Markdown report
 * covering the same 14 canonical sections as the PDF deliverable.
 */
export function generateMarkdownReport(synthesizedData) {
  const { metadata, sections } = synthesizedData;
  const {
    executiveSummary,
    businessObjectives,
    businessContext,
    proposedSolution,
    enterpriseArchitecture,
    businessProcess,
    userExperience,
    dataAndApi,
    roadmap,
    riskRegister,
    investment,
    governance,
    expectedOutcomes,
    technicalAppendix
  } = sections;

  const dateFormatted = new Date(metadata.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  let md = `# ENTERPRISE SOLUTION ARCHITECTURE & TRANSFORMATION BLUEPRINT\n\n`;
  md += `**Project / Workspace:** ${metadata.workspaceName}\n`;
  md += `**Organization:** ${metadata.organizationName}\n`;
  md += `**Industry Domain:** ${metadata.industry}\n`;
  md += `**Document Version:** ${metadata.exportVersion}\n`;
  md += `**Generated Date:** ${dateFormatted}\n`;
  md += `**Lifecycle Governance Status:** ${metadata.lifecycleStatus}\n\n`;
  md += `---\n\n`;

  // 1. Executive Summary
  md += `## 1. Executive Summary\n\n`;
  md += `### Business Situation\n${executiveSummary.businessSituation}\n\n`;
  md += `### Core Business Challenge\n${executiveSummary.currentProblem}\n\n`;
  md += `### Proposed Transformation\n${executiveSummary.proposedTransformation}\n\n`;
  md += `### Major Expected Outcomes\n${executiveSummary.majorExpectedOutcomes}\n\n`;
  md += `---\n\n`;

  // 2. Business Objectives & Success Metrics
  md += `## 2. Business Objectives & Success Metrics\n\n`;
  md += `### Strategic Objectives\n`;
  businessObjectives.objectives.forEach(obj => {
    md += `- ${obj}\n`;
  });
  md += `\n`;

  md += `### Measurable KPIs\n\n`;
  md += `| Metric | Current State | Target State | Business Impact |\n`;
  md += `|---|---|---|---|\n`;
  businessObjectives.kpis.forEach(k => {
    md += `| **${k.metric || k.name}** | ${k.currentState || 'Baseline'} | ${k.targetState || 'Target'} | ${k.businessImpact || '-'} |\n`;
  });
  md += `\n`;
  if (businessObjectives.digitalMaturityScore) {
    md += `**Digital Maturity Diagnostic Score:** ${businessObjectives.digitalMaturityScore} / 100\n\n`;
  }
  md += `---\n\n`;

  // 3. Discovery & Business Context
  md += `## 3. Discovery & Business Context\n\n`;
  md += `**Organization:** ${businessContext.organization} | **Industry:** ${businessContext.industry}\n\n`;
  md += `### Current State Diagnostic\n${businessContext.currentState}\n\n`;
  md += `### Future State Vision\n${businessContext.futureStateVision}\n\n`;
  md += `### Core Operational Pain Points\n`;
  businessContext.painPoints.forEach(p => {
    md += `- ${p}\n`;
  });
  md += `\n`;

  if (businessContext.automationOpportunities && businessContext.automationOpportunities.length > 0) {
    md += `### Automation Opportunities\n\n`;
    md += `| Opportunity | Impact | Effort | Value / Saving |\n`;
    md += `|---|---|---|---|\n`;
    businessContext.automationOpportunities.forEach(o => {
      md += `| **${o.title || o}** | ${o.impact || 'High'} | ${o.effort || 'Medium'} | ${o.saving || 'Efficiency'} |\n`;
    });
    md += `\n`;
  }
  md += `---\n\n`;

  // 4. Proposed Solution
  md += `## 4. Proposed Solution\n\n`;
  md += `### ${proposedSolution.title}\n`;
  md += `${proposedSolution.summary}\n\n`;
  md += `**Business Value:** ${proposedSolution.businessValue}\n\n`;
  md += `**Architecture Strategy:** ${proposedSolution.selectedStrategy}\n\n`;
  md += `### Core Capabilities\n`;
  proposedSolution.capabilities.forEach(c => {
    md += `- ${c}\n`;
  });
  md += `\n`;

  md += `### Recommended Technology Stack\n\n`;
  md += `| Architecture Layer | Technology Choice |\n`;
  md += `|---|---|\n`;
  Object.entries(proposedSolution.techStack).forEach(([layer, tech]) => {
    md += `| **${layer.replace(/_/g, ' ').toUpperCase()}** | ${tech} |\n`;
  });
  md += `\n---\n\n`;

  // 5. Enterprise Architecture
  md += `## 5. Enterprise Architecture\n\n`;
  md += `${enterpriseArchitecture.highLevelDesign}\n\n`;
  md += `### Architecture Tiers\n\n`;
  md += `- **Client Layer:** ${enterpriseArchitecture.tiers.client.map(n => n.label).join(', ') || 'Web & Mobile Client'}\n`;
  md += `- **API Gateway:** ${enterpriseArchitecture.tiers.gateway.map(n => n.label).join(', ') || 'Enterprise API Gateway'}\n`;
  md += `- **Application Services:** ${enterpriseArchitecture.tiers.services.map(n => n.label).join(', ') || 'Domain Services'}\n`;
  md += `- **Persistence:** ${enterpriseArchitecture.tiers.persistence.map(n => n.label).join(', ') || 'Relational Database'}\n`;
  md += `- **Integrations:** ${enterpriseArchitecture.tiers.integrations.map(n => n.label).join(', ') || 'Enterprise Adapters'}\n\n`;
  md += `### Security & Governance Boundaries\n${enterpriseArchitecture.securityArchitecture}\n\n`;
  md += `### Deployment Architecture\n${enterpriseArchitecture.deploymentArchitecture}\n\n`;
  md += `---\n\n`;

  // 6. Business Process & Workflow
  md += `## 6. Business Process & Workflow\n\n`;
  md += `**Workflow Title:** ${businessProcess.title} (${businessProcess.type})\n\n`;
  md += `${businessProcess.description}\n\n`;
  md += `### Future-State Workflow Steps\n\n`;
  md += `| Step | Step Name | Actor | Action / Description | Condition |\n`;
  md += `|---|---|---|---|---|\n`;
  businessProcess.steps.forEach(s => {
    md += `| ${s.order} | **${s.name}** | ${s.actor} | ${s.description} | ${s.condition} |\n`;
  });
  md += `\n---\n\n`;

  // 7. User Experience
  md += `## 7. User Experience\n\n`;
  md += `### Target Personas\n\n`;
  md += `| Persona | Role | Primary Goal |\n`;
  md += `|---|---|---|\n`;
  userExperience.personas.forEach(p => {
    md += `| **${p.name}** | ${p.role} | ${p.goal} |\n`;
  });
  md += `\n`;

  if (userExperience.screens && userExperience.screens.length > 0) {
    md += `### Application Screen Inventory\n\n`;
    md += `| Screen Name | Layout | Primary Function |\n`;
    md += `|---|---|---|\n`;
    userExperience.screens.forEach(s => {
      md += `| **${s.title || s.name}** | ${s.type || s.layout || 'View'} | ${s.description || '-'} |\n`;
    });
    md += `\n`;
  }
  md += `**Accessibility Compliance:** ${userExperience.accessibilityNotes}\n\n`;
  md += `---\n\n`;

  // 8. Data & API Design
  md += `## 8. Data & API Design\n\n`;
  md += `### Core Relational Entities\n\n`;
  md += `| Entity | Primary Key | Total Fields | Business Meaning |\n`;
  md += `|---|---|---|---|\n`;
  dataAndApi.entities.forEach(e => {
    md += `| **${e.name}** | \`${e.primaryKey}\` | ${e.fieldsCount} | ${e.description} |\n`;
  });
  md += `\n`;

  md += `### Primary REST API Contracts\n\n`;
  md += `| Method | Endpoint | Description | Authentication |\n`;
  md += `|---|---|---|---|\n`;
  dataAndApi.endpoints.forEach(ep => {
    md += `| \`${ep.method}\` | \`${ep.endpoint}\` | ${ep.description} | ${ep.authentication} |\n`;
  });
  md += `\n---\n\n`;

  // 9. Implementation Roadmap
  md += `## 9. Implementation Roadmap\n\n`;
  md += `**Total Estimated Duration:** ${roadmap.estimatedDurationWeeks} Weeks | **Estimated Investment:** ${roadmap.estimatedCost}\n\n`;
  md += `### Execution Phases\n\n`;
  md += `| Phase | Duration | Focus Area | Planned Tasks |\n`;
  md += `|---|---|---|---|\n`;
  roadmap.phases.forEach(p => {
    md += `| **${p.name}** | ${p.durationWeeks} Weeks | ${p.focus} | ${p.tasks.length} tasks scheduled |\n`;
  });
  md += `\n---\n\n`;

  // 10. Risk & Governance
  md += `## 10. Risk & Governance Register\n\n`;
  md += `| Severity | Risk Title | Potential Impact | Mitigation Strategy |\n`;
  md += `|---|---|---|---|\n`;
  riskRegister.forEach(r => {
    md += `| **${r.severity}** | ${r.title} | ${r.impact} | ${r.mitigation} |\n`;
  });
  md += `\n---\n\n`;

  // 11. Implementation Investment
  md += `## 11. Implementation Investment & Resources\n\n`;
  md += `**Investment Scope:** ${investment.estimatedCostRange}\n\n`;
  md += `**Methodology:** ${investment.methodology}\n\n`;
  md += `### Resource Allocation by Role\n\n`;
  md += `| Professional Role | Allocated Effort (Weeks) |\n`;
  md += `|---|---|\n`;
  investment.roleAllocations.forEach(ra => {
    md += `| **${ra.role}** | ${ra.estimatedWeeks} Weeks |\n`;
  });
  md += `\n---\n\n`;

  // 12. Governance & Sign-off
  md += `## 12. Governance & Sign-off Status\n\n`;
  if (governance.signoffs.length > 0) {
    md += `| Artifact Stage | Version | Status | Reviewer | Role | Remarks | Date |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    governance.signoffs.forEach(s => {
      md += `| **${s.artifactType}** | V${s.versionNumber} | ${s.status} | ${s.reviewerName} | ${s.reviewerRole} | ${s.comments || 'Approved'} | ${new Date(s.timestamp).toLocaleDateString()} |\n`;
    });
    md += `\n`;
  } else {
    md += `*No formal stage sign-offs have been recorded yet for this workspace.*\n\n`;
  }
  md += `---\n\n`;

  // 13. Expected Business Outcomes
  md += `## 13. Expected Business Outcomes\n\n`;
  expectedOutcomes.forEach(o => {
    md += `### ${o.category}\n${o.description}\n\n`;
  });
  md += `---\n\n`;

  // 14. Technical Appendix
  md += `## 14. Technical Appendix\n\n`;
  md += `### Relational Database SQL DDL\n\n\`\`\`sql\n${technicalAppendix.sqlDdl}\n\`\`\`\n\n`;

  return md;
}

/**
 * Generate Presentation-Ready Executive HTML Report
 */
export function generateHtmlReport(synthesizedData) {
  return renderExecutiveHtmlReport(synthesizedData);
}

/**
 * Generate Canonical Structured JSON Bundle
 */
export function generateJsonBundle(synthesizedData) {
  const { metadata, sections, rawBundle } = synthesizedData;
  return JSON.stringify({
    workspace: {
      id: metadata.workspaceId,
      name: metadata.workspaceName,
      organization: metadata.organizationName,
      industry: metadata.industry,
      status: metadata.lifecycleStatus,
      description: rawBundle.workspace?.description,
      objective: rawBundle.workspace?.objective,
      challenge: rawBundle.workspace?.challenge,
      targetUsers: rawBundle.workspace?.targetUsers,
      expectedOutcome: rawBundle.workspace?.expectedOutcome
    },
    businessContext: {
      currentState: sections.businessContext.currentState,
      futureState: sections.businessContext.futureStateVision,
      painPoints: sections.businessContext.painPoints,
      automationOpportunities: sections.businessContext.automationOpportunities
    },
    requirements: sections.businessObjectives.objectives,
    solution: {
      title: sections.proposedSolution.title,
      summary: sections.proposedSolution.summary,
      businessValue: sections.proposedSolution.businessValue,
      selectedStrategy: sections.proposedSolution.selectedStrategy,
      capabilities: sections.proposedSolution.capabilities,
      techStack: sections.proposedSolution.techStack
    },
    architecture: {
      title: sections.enterpriseArchitecture.title,
      highLevelDesign: sections.enterpriseArchitecture.highLevelDesign,
      securityArchitecture: sections.enterpriseArchitecture.securityArchitecture,
      deploymentArchitecture: sections.enterpriseArchitecture.deploymentArchitecture,
      nodes: sections.enterpriseArchitecture.nodes,
      edges: sections.enterpriseArchitecture.edges
    },
    processes: [
      {
        title: sections.businessProcess.title,
        type: sections.businessProcess.type,
        description: sections.businessProcess.description,
        steps: sections.businessProcess.steps
      }
    ],
    ux: {
      domain: sections.userExperience.domain,
      personas: sections.userExperience.personas,
      screens: sections.userExperience.screens,
      accessibility: sections.userExperience.accessibilityNotes
    },
    database: {
      entities: sections.dataAndApi.entities
    },
    apis: sections.dataAndApi.endpoints,
    implementationPlan: {
      durationWeeks: sections.roadmap.estimatedDurationWeeks,
      estimatedCost: sections.roadmap.estimatedCost,
      phases: sections.roadmap.phases,
      tasks: sections.roadmap.allTasks
    },
    collaboration: {
      approvals: sections.governance.signoffs,
      openComments: sections.governance.openComments
    },
    versions: rawBundle.versions.map(v => ({
      id: v.id,
      artifactType: v.artifactType,
      versionNumber: v.versionNumber,
      notes: v.notes,
      createdAt: v.createdAt
    })),
    metadata: {
      workspaceId: metadata.workspaceId,
      exportVersion: metadata.exportVersion,
      generatedAt: metadata.generatedAt,
      sourceVersions: metadata.sourceVersions
    }
  }, null, 2);
}

/**
 * Generate Clean Tasks & Sprints CSV (RFC 4180)
 */
export function generateTasksCsv(synthesizedData) {
  const { sections } = synthesizedData;
  const tasks = sections.roadmap?.allTasks || [];

  const headers = [
    'Task ID',
    'Task Title',
    'Phase',
    'Sprint',
    'Assigned Role',
    'Duration (Weeks)',
    'Risk',
    'Status',
    'Dependencies',
    'Source Requirement',
    'Description'
  ];

  function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  const rows = [headers.join(',')];
  tasks.forEach(t => {
    rows.push([
      escapeCsv(t.id),
      escapeCsv(t.title),
      escapeCsv(t.phaseName),
      escapeCsv(t.sprint),
      escapeCsv(t.assignedRole),
      t.durationWeeks || 1,
      escapeCsv(t.riskLevel),
      escapeCsv(t.status),
      escapeCsv(t.dependencies),
      escapeCsv(t.sourceRequirement),
      escapeCsv(t.description)
    ].join(','));
  });

  return rows.join('\n');
}

export { generateExecutivePptx };
