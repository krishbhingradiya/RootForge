/**
 * Executive PDF / HTML Document Renderer
 * Generates an executive consulting deliverable with zero raw Markdown.
 * Includes cover page, table of contents, visual diagrams, styled data tables,
 * executive callouts, and a dedicated Technical Appendix.
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderExecutiveHtmlReport(synthesizedData) {
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

  const generatedDateFormatted = new Date(metadata.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.workspaceName)} — Executive Solution Blueprint</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1E232D;
      --accent: #D97706;
      --accent-light: #FEF3C7;
      --accent-green: #059669;
      --accent-green-light: #D1FAE5;
      --accent-blue: #2563EB;
      --accent-blue-light: #DBEAFE;
      --accent-red: #DC2626;
      --accent-red-light: #FEE2E2;
      --text-main: #1F242D;
      --text-muted: #64748B;
      --border-subtle: #E2E8F0;
      --bg-surface: #FFFFFF;
      --bg-subtle: #F8FAFC;
    }

    * { box-sizing: border-box; }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text-main);
      background-color: #F1F5F9;
      margin: 0;
      padding: 0;
      font-size: 14px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .doc-container {
      max-width: 960px;
      margin: 30px auto;
      background: #FFFFFF;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      overflow: hidden;
    }

    /* Print Controls Header Bar */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #111827;
      color: #FFFFFF;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .toolbar .title { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .toolbar .btn-print {
      background: #D97706;
      color: #FFFFFF;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toolbar .btn-print:hover { background: #B45309; }

    /* Document Sheet */
    .document-body {
      padding: 60px 64px;
    }

    /* Cover Page */
    .cover-page {
      min-height: 780px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-bottom: 2px solid var(--border-subtle);
      padding-bottom: 40px;
      margin-bottom: 60px;
      page-break-after: always;
    }

    .cover-brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-logo {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-badge {
      background: #111827;
      color: #FFFFFF;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .cover-hero {
      margin: 80px 0 60px;
    }
    .cover-tag {
      display: inline-block;
      color: var(--accent);
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .cover-title {
      font-size: 34px;
      font-weight: 800;
      line-height: 1.25;
      color: #0F172A;
      margin: 0 0 16px 0;
    }
    .cover-subtitle {
      font-size: 16px;
      color: var(--text-muted);
      max-width: 680px;
      line-height: 1.6;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      background: var(--bg-subtle);
      padding: 24px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
    }
    .meta-item .meta-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .meta-item .meta-value {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
    }

    /* Table of Contents */
    .toc-section {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 28px 32px;
      margin-bottom: 60px;
      page-break-after: always;
    }
    .toc-title {
      font-size: 18px;
      font-weight: 800;
      margin: 0 0 20px 0;
      color: #0F172A;
      border-bottom: 2px solid var(--accent);
      padding-bottom: 8px;
      display: inline-block;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 32px;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 13px;
      color: var(--text-main);
      text-decoration: none;
      border-bottom: 1px dotted var(--border-subtle);
      padding-bottom: 4px;
    }
    .toc-item:hover { color: var(--accent); }
    .toc-item .num { font-weight: 700; color: var(--accent); margin-right: 8px; }

    /* Section Headings */
    .section-block {
      margin-bottom: 48px;
    }
    .section-header {
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    h2.section-title {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h2.section-title .sec-num {
      color: var(--accent);
    }
    h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1E293B;
      margin: 24px 0 10px 0;
    }

    /* Callout Boxes */
    .callout {
      background: var(--bg-subtle);
      border-left: 4px solid var(--accent);
      padding: 16px 20px;
      border-radius: 0 6px 6px 0;
      margin: 16px 0;
    }
    .callout-title {
      font-weight: 700;
      font-size: 13px;
      color: var(--accent);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .callout p { margin: 0; font-size: 13.5px; }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px 0;
      font-size: 13px;
    }
    table.data-table th {
      background: #F1F5F9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 10px 14px;
      border: 1px solid #CBD5E1;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    table.data-table td {
      padding: 10px 14px;
      border: 1px solid #E2E8F0;
      vertical-align: top;
    }
    table.data-table tr:nth-child(even) td {
      background: #F8FAFC;
    }

    /* Visual Architecture & Process Diagrams */
    .diagram-container {
      background: #0F172A;
      color: #F8FAFC;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
    }
    .diagram-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94A3B8;
      margin-bottom: 16px;
    }
    .tier-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      align-items: stretch;
    }
    .tier-label {
      width: 130px;
      font-size: 11px;
      font-weight: 700;
      color: #CBD5E1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
    }
    .tier-boxes {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      flex: 1;
    }
    .tier-box {
      background: #1E293B;
      border: 1px solid #334155;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      color: #F1F5F9;
      font-weight: 600;
    }

    /* Workflow Cards */
    .workflow-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 16px 0;
    }
    .workflow-step {
      display: grid;
      grid-template-columns: 48px 160px 1fr 140px;
      gap: 14px;
      align-items: center;
      padding: 10px 16px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      font-size: 13px;
    }
    .step-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
    }
    .step-actor {
      font-weight: 700;
      color: #1E293B;
    }
    .step-condition {
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-green { background: var(--accent-green-light); color: #065F46; border: 1px solid rgba(5,150,105,0.25); }
    .badge-blue { background: var(--accent-blue-light); color: #1E40AF; border: 1px solid rgba(37,99,235,0.25); }
    .badge-amber { background: var(--accent-light); color: #92400E; border: 1px solid rgba(217,119,6,0.25); }
    .badge-red { background: var(--accent-red-light); color: #DC2626; border: 1px solid rgba(220,38,38,0.25); }
    .badge-gray { background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }

    /* Code Block & DDL */
    pre.code-block {
      font-family: 'JetBrains Mono', monospace;
      background: #0F172A;
      color: #E2E8F0;
      padding: 16px 20px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      margin: 14px 0;
    }

    /* Print Rules */
    @media print {
      body { background: #FFFFFF; }
      .toolbar { display: none !important; }
      .doc-container { box-shadow: none; max-width: 100%; margin: 0; border-radius: 0; }
      .document-body { padding: 0; }
      .cover-page { page-break-after: always; min-height: 92vh; }
      .toc-section { page-break-after: always; }
      .section-block { page-break-inside: auto; }
      h2.section-title { page-break-after: avoid; }
      h3 { page-break-after: avoid; }
      table.data-table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Print Toolbar -->
  <div class="toolbar">
    <div class="title">
      <span>🛡️ RootForge Enterprise Export Center</span>
      <span style="opacity: 0.6;">|</span>
      <span style="font-weight: 500; font-size: 13px;">${escapeHtml(metadata.workspaceName)}</span>
    </div>
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="doc-container">
    <div class="document-body">

      <!-- ════ COVER PAGE ═══════════════════════════════════════════════════ -->
      <div class="cover-page">
        <div class="cover-brand">
          <div class="brand-logo">
            <span style="color: var(--accent);">✦</span> ROOTFORGE
          </div>
          <div class="brand-badge">Executive Consulting Deliverable</div>
        </div>

        <div class="cover-hero">
          <span class="cover-tag">Lifecycle Solution Blueprint</span>
          <h1 class="cover-title">${escapeHtml(proposedSolution.title || metadata.workspaceName)}</h1>
          <p class="cover-subtitle">${escapeHtml(executiveSummary.proposedTransformation)}</p>
        </div>

        <div class="cover-meta-grid">
          <div class="meta-item">
            <div class="meta-label">Client / Workspace</div>
            <div class="meta-value">${escapeHtml(metadata.workspaceName)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Industry Domain</div>
            <div class="meta-value">${escapeHtml(metadata.industry)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Deliverable Version</div>
            <div class="meta-value">${escapeHtml(metadata.exportVersion)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Generated Date</div>
            <div class="meta-value">${escapeHtml(generatedDateFormatted)}</div>
          </div>
        </div>
      </div>

      <!-- ════ TABLE OF CONTENTS ═══════════════════════════════════════════ -->
      <div class="toc-section">
        <div class="toc-title">Table of Contents</div>
        <div class="toc-grid">
          <a href="#sec-1" class="toc-item"><span class="num">01</span><span>Executive Summary</span></a>
          <a href="#sec-2" class="toc-item"><span class="num">02</span><span>Business Objectives & Success Metrics</span></a>
          <a href="#sec-3" class="toc-item"><span class="num">03</span><span>Discovery & Business Context</span></a>
          <a href="#sec-4" class="toc-item"><span class="num">04</span><span>Proposed Solution</span></a>
          <a href="#sec-5" class="toc-item"><span class="num">05</span><span>Enterprise Architecture</span></a>
          <a href="#sec-6" class="toc-item"><span class="num">06</span><span>Business Process & Workflow</span></a>
          <a href="#sec-7" class="toc-item"><span class="num">07</span><span>User Experience</span></a>
          <a href="#sec-8" class="toc-item"><span class="num">08</span><span>Data & API Design</span></a>
          <a href="#sec-9" class="toc-item"><span class="num">09</span><span>Implementation Roadmap</span></a>
          <a href="#sec-10" class="toc-item"><span class="num">10</span><span>Risk & Governance</span></a>
          <a href="#sec-11" class="toc-item"><span class="num">11</span><span>Implementation Investment</span></a>
          <a href="#sec-12" class="toc-item"><span class="num">12</span><span>Governance & Sign-off</span></a>
          <a href="#sec-13" class="toc-item"><span class="num">13</span><span>Expected Business Outcomes</span></a>
          <a href="#sec-14" class="toc-item"><span class="num">14</span><span>Technical Appendix</span></a>
        </div>
      </div>

      <!-- ════ 1. EXECUTIVE SUMMARY ═════════════════════════════════════════ -->
      <div id="sec-1" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">1.</span> Executive Summary</h2>
        </div>
        <p><strong>Business Situation:</strong> ${escapeHtml(executiveSummary.businessSituation)}</p>
        
        <div class="callout">
          <div class="callout-title">Core Business Challenge</div>
          <p>${escapeHtml(executiveSummary.currentProblem)}</p>
        </div>

        <p><strong>Proposed Transformation:</strong> ${escapeHtml(executiveSummary.proposedTransformation)}</p>
        <p><strong>Major Expected Outcomes:</strong> ${escapeHtml(executiveSummary.majorExpectedOutcomes)}</p>
      </div>

      <!-- ════ 2. BUSINESS OBJECTIVES & SUCCESS METRICS ════════════════════ -->
      <div id="sec-2" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">2.</span> Business Objectives & Success Metrics</h2>
        </div>
        <h3>Strategic Business Objectives</h3>
        <ul>
          ${businessObjectives.objectives.map(obj => `<li>${escapeHtml(obj)}</li>`).join('')}
        </ul>

        <h3>Measurable KPIs & Value Realization</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current State</th>
              <th>Target State</th>
              <th>Business Impact</th>
            </tr>
          </thead>
          <tbody>
            ${businessObjectives.kpis.map(k => `
              <tr>
                <td><strong>${escapeHtml(k.metric || k.name || 'Metric')}</strong></td>
                <td>${escapeHtml(k.currentState || 'Manual / Baseline')}</td>
                <td><span class="badge badge-green">${escapeHtml(k.targetState || k.target || 'Target')}</span></td>
                <td>${escapeHtml(k.businessImpact || k.impact || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${businessObjectives.digitalMaturityScore ? `
          <p><strong>Digital Maturity Diagnostic Score:</strong> ${escapeHtml(businessObjectives.digitalMaturityScore)} / 100</p>
        ` : ''}
      </div>

      <!-- ════ 3. DISCOVERY & BUSINESS CONTEXT ═════════════════════════════ -->
      <div id="sec-3" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">3.</span> Discovery & Business Context</h2>
        </div>
        <p><strong>Organization:</strong> ${escapeHtml(businessContext.organization)} | <strong>Industry:</strong> ${escapeHtml(businessContext.industry)}</p>
        <p><strong>Current State Diagnostic:</strong> ${escapeHtml(businessContext.currentState)}</p>
        <p><strong>Future State Vision:</strong> ${escapeHtml(businessContext.futureStateVision)}</p>

        <h3>Identified Operational Pain Points</h3>
        <ul>
          ${businessContext.painPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>

        ${businessContext.automationOpportunities && businessContext.automationOpportunities.length > 0 ? `
          <h3>Automation Opportunities</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Impact</th>
                <th>Effort</th>
                <th>Estimated Saving</th>
              </tr>
            </thead>
            <tbody>
              ${businessContext.automationOpportunities.map(o => `
                <tr>
                  <td><strong>${escapeHtml(o.title || o)}</strong></td>
                  <td><span class="badge ${o.impact === 'HIGH' ? 'badge-green' : 'badge-blue'}">${escapeHtml(o.impact || 'High')}</span></td>
                  <td>${escapeHtml(o.effort || 'Medium')}</td>
                  <td>${escapeHtml(o.saving || 'Operational efficiency')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>

      <!-- ════ 4. PROPOSED SOLUTION ════════════════════════════════════════ -->
      <div id="sec-4" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">4.</span> Proposed Solution</h2>
        </div>
        <h3>${escapeHtml(proposedSolution.title)}</h3>
        <p>${escapeHtml(proposedSolution.summary)}</p>
        <p><strong>Strategic Business Value:</strong> ${escapeHtml(proposedSolution.businessValue)}</p>
        <p><strong>Selected Architecture Strategy:</strong> ${escapeHtml(proposedSolution.selectedStrategy)}</p>

        <h3>Core Solution Capabilities</h3>
        <ul>
          ${proposedSolution.capabilities.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>

        <h3>Technology Stack Specification</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Architecture Layer</th>
              <th>Recommended Technology Choice</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(proposedSolution.techStack).map(([layer, tech]) => `
              <tr>
                <td><strong>${escapeHtml(layer.replace(/_/g, ' ').toUpperCase())}</strong></td>
                <td>${escapeHtml(tech)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- ════ 5. ENTERPRISE ARCHITECTURE ══════════════════════════════════ -->
      <div id="sec-5" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">5.</span> Enterprise Architecture</h2>
        </div>
        <p>${escapeHtml(enterpriseArchitecture.highLevelDesign)}</p>

        <!-- Visual Architecture Diagram -->
        <div class="diagram-container">
          <div class="diagram-title">Target Solution Architecture Topology</div>
          
          <div class="tier-row">
            <div class="tier-label">Client Layer</div>
            <div class="tier-boxes">
              ${enterpriseArchitecture.tiers.client.length > 0
                ? enterpriseArchitecture.tiers.client.map(n => `<div class="tier-box">💻 ${escapeHtml(n.label)}</div>`).join('')
                : '<div class="tier-box">💻 Responsive Web Client & Mobile Portals</div>'}
            </div>
          </div>

          <div class="tier-row">
            <div class="tier-label">API Gateway</div>
            <div class="tier-boxes">
              ${enterpriseArchitecture.tiers.gateway.length > 0
                ? enterpriseArchitecture.tiers.gateway.map(n => `<div class="tier-box">🛡️ ${escapeHtml(n.label)}</div>`).join('')
                : '<div class="tier-box">🛡️ Secure Enterprise API Gateway & Auth</div>'}
            </div>
          </div>

          <div class="tier-row">
            <div class="tier-label">Core Services</div>
            <div class="tier-boxes">
              ${enterpriseArchitecture.tiers.services.length > 0
                ? enterpriseArchitecture.tiers.services.map(n => `<div class="tier-box">⚙️ ${escapeHtml(n.label)}</div>`).join('')
                : '<div class="tier-box">⚙️ Core Domain Services & Workflow Engines</div>'}
            </div>
          </div>

          <div class="tier-row">
            <div class="tier-label">Persistence</div>
            <div class="tier-boxes">
              ${enterpriseArchitecture.tiers.persistence.length > 0
                ? enterpriseArchitecture.tiers.persistence.map(n => `<div class="tier-box">🗄️ ${escapeHtml(n.label)}</div>`).join('')
                : '<div class="tier-box">🗄️ Relational PostgreSQL & Cache</div>'}
            </div>
          </div>

          <div class="tier-row">
            <div class="tier-label">Integrations</div>
            <div class="tier-boxes">
              ${enterpriseArchitecture.tiers.integrations.length > 0
                ? enterpriseArchitecture.tiers.integrations.map(n => `<div class="tier-box">🔌 ${escapeHtml(n.label)}</div>`).join('')
                : '<div class="tier-box">🔌 External Enterprise Adapters</div>'}
            </div>
          </div>
        </div>

        <h3>Security & Governance Boundaries</h3>
        <p>${escapeHtml(enterpriseArchitecture.securityArchitecture)}</p>

        <h3>Deployment Architecture</h3>
        <p>${escapeHtml(enterpriseArchitecture.deploymentArchitecture)}</p>
      </div>

      <!-- ════ 6. BUSINESS PROCESS & WORKFLOW ══════════════════════════════ -->
      <div id="sec-6" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">6.</span> Business Process & Workflow</h2>
        </div>
        <p><strong>Workflow:</strong> ${escapeHtml(businessProcess.title)} (${escapeHtml(businessProcess.type)})</p>
        <p>${escapeHtml(businessProcess.description)}</p>

        <h3>Future-State Workflow Sequence</h3>
        <div class="workflow-grid">
          ${businessProcess.steps.map(s => `
            <div class="workflow-step">
              <div class="step-badge">${escapeHtml(s.order)}</div>
              <div class="step-actor">${escapeHtml(s.name)}<br><small style="color:var(--text-muted); font-weight:400;">${escapeHtml(s.actor)}</small></div>
              <div>${escapeHtml(s.description)}</div>
              <div class="step-condition">${escapeHtml(s.condition)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ════ 7. USER EXPERIENCE ══════════════════════════════════════════ -->
      <div id="sec-7" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">7.</span> User Experience</h2>
        </div>
        <h3>Target Personas</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Role</th>
              <th>Primary Goal</th>
            </tr>
          </thead>
          <tbody>
            ${userExperience.personas.map(p => `
              <tr>
                <td><strong>${escapeHtml(p.name || 'User Persona')}</strong></td>
                <td>${escapeHtml(p.role || '-')}</td>
                <td>${escapeHtml(p.goal || p.goals || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${userExperience.screens && userExperience.screens.length > 0 ? `
          <h3>Application Screen Inventory</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Screen</th>
                <th>Layout Type</th>
                <th>Primary Function</th>
              </tr>
            </thead>
            <tbody>
              ${userExperience.screens.map(s => `
                <tr>
                  <td><strong>${escapeHtml(s.title || s.name || 'Screen')}</strong></td>
                  <td>${escapeHtml(s.type || s.layout || 'Dashboard')}</td>
                  <td>${escapeHtml(s.description || s.summary || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <p><strong>Accessibility Standards:</strong> ${escapeHtml(userExperience.accessibilityNotes)}</p>
      </div>

      <!-- ════ 8. DATA & API DESIGN ════════════════════════════════════════ -->
      <div id="sec-8" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">8.</span> Data & API Design</h2>
        </div>
        <p>The enterprise solution establishes a canonical relational domain schema. Core entities are structured to maintain transactional consistency and auditability.</p>
        
        <h3>Core Domain Entities</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Entity</th>
              <th>Primary Key</th>
              <th>Fields Count</th>
              <th>Business Meaning</th>
            </tr>
          </thead>
          <tbody>
            ${dataAndApi.entities.map(e => `
              <tr>
                <td><strong>${escapeHtml(e.name)}</strong></td>
                <td><code>${escapeHtml(e.primaryKey)}</code></td>
                <td>${escapeHtml(e.fieldsCount)} fields</td>
                <td>${escapeHtml(e.description)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>Primary Enterprise REST APIs</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
              <th>Authentication</th>
            </tr>
          </thead>
          <tbody>
            ${dataAndApi.endpoints.map(ep => `
              <tr>
                <td><span class="badge ${ep.method === 'GET' ? 'badge-blue' : ep.method === 'POST' ? 'badge-green' : 'badge-amber'}">${escapeHtml(ep.method)}</span></td>
                <td><code>${escapeHtml(ep.endpoint)}</code></td>
                <td>${escapeHtml(ep.description)}</td>
                <td>${escapeHtml(ep.authentication)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="font-size: 12px; color: var(--text-muted); font-style: italic;">
          * Note: Full relational field definitions, SQL DDL, and API request/response payload schemas are detailed in Section 14 (Technical Appendix).
        </p>
      </div>

      <!-- ════ 9. IMPLEMENTATION ROADMAP ═══════════════════════════════════ -->
      <div id="sec-9" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">9.</span> Implementation Roadmap</h2>
        </div>
        <p><strong>Estimated Total Timeline:</strong> ${escapeHtml(roadmap.estimatedDurationWeeks)} Weeks | <strong>Estimated Investment:</strong> ${escapeHtml(roadmap.estimatedCost)}</p>

        <h3>Phased Execution Plan</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Duration</th>
              <th>Strategic Focus</th>
              <th>Planned Tasks</th>
            </tr>
          </thead>
          <tbody>
            ${roadmap.phases.map(p => `
              <tr>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${escapeHtml(p.durationWeeks)} Weeks</td>
                <td>${escapeHtml(p.focus)}</td>
                <td>${escapeHtml(p.tasks.length)} tasks scheduled</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- ════ 10. RISK & GOVERNANCE ═══════════════════════════════════════ -->
      <div id="sec-10" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">10.</span> Risk & Governance Register</h2>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Risk Description</th>
              <th>Impact Analysis</th>
              <th>Mitigation Strategy</th>
            </tr>
          </thead>
          <tbody>
            ${riskRegister.map(r => `
              <tr>
                <td><span class="badge ${r.severity === 'HIGH' ? 'badge-red' : r.severity === 'MEDIUM' ? 'badge-amber' : 'badge-green'}">${escapeHtml(r.severity)}</span></td>
                <td><strong>${escapeHtml(r.title)}</strong></td>
                <td>${escapeHtml(r.impact)}</td>
                <td>${escapeHtml(r.mitigation)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- ════ 11. IMPLEMENTATION INVESTMENT ═══════════════════════════════ -->
      <div id="sec-11" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">11.</span> Implementation Investment</h2>
        </div>
        <p><strong>Investment Scope:</strong> ${escapeHtml(investment.estimatedCostRange)}</p>
        <p><strong>Delivery Methodology:</strong> ${escapeHtml(investment.methodology)}</p>

        <h3>Resource Allocation by Role</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Assigned Professional Role</th>
              <th>Allocated Effort (Sprint Weeks)</th>
            </tr>
          </thead>
          <tbody>
            ${investment.roleAllocations.map(ra => `
              <tr>
                <td><strong>${escapeHtml(ra.role)}</strong></td>
                <td>${escapeHtml(ra.estimatedWeeks)} Weeks</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- ════ 12. GOVERNANCE & SIGN-OFF ═══════════════════════════════════ -->
      <div id="sec-12" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">12.</span> Governance & Sign-off Status</h2>
        </div>
        <p>All lifecycle deliverables maintain immutable governance audit records. Sign-offs are tied to specific artifact snapshots.</p>

        <h3>Recorded Stage Sign-offs</h3>
        ${governance.signoffs.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Artifact Stage</th>
                <th>Version</th>
                <th>Status</th>
                <th>Reviewer</th>
                <th>Role</th>
                <th>Notes / Comments</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${governance.signoffs.map(s => `
                <tr>
                  <td><strong>${escapeHtml(s.artifactType)}</strong></td>
                  <td><span class="badge badge-gray">V${escapeHtml(s.versionNumber)}</span></td>
                  <td><span class="badge ${s.status === 'APPROVED' ? 'badge-green' : s.status === 'IN_REVIEW' ? 'badge-blue' : s.status === 'CHANGES_REQUESTED' ? 'badge-amber' : 'badge-gray'}">${escapeHtml(s.status)}</span></td>
                  <td>${escapeHtml(s.reviewerName)}</td>
                  <td>${escapeHtml(s.reviewerRole)}</td>
                  <td>${escapeHtml(s.comments || 'No remarks')}</td>
                  <td style="font-size: 11px; color: var(--text-muted);">${escapeHtml(new Date(s.timestamp).toLocaleDateString())}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="color: var(--text-muted);">No formal sign-offs have been recorded yet for this workspace.</p>'}

        ${governance.openComments.length > 0 ? `
          <h3>Open Review Feedback (${governance.openComments.length} items)</h3>
          <ul>
            ${governance.openComments.map(c => `
              <li><strong>${escapeHtml(c.author)}</strong> (${escapeHtml(c.artifactType)}): "${escapeHtml(c.content)}"</li>
            `).join('')}
          </ul>
        ` : ''}
      </div>

      <!-- ════ 13. EXPECTED BUSINESS OUTCOMES ══════════════════════════════ -->
      <div id="sec-13" class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">13.</span> Expected Business Outcomes</h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0;">
          ${expectedOutcomes.map(o => `
            <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); padding: 18px; border-radius: 8px;">
              <h4 style="margin: 0 0 8px 0; color: #0F172A; font-size: 14px;">${escapeHtml(o.category)}</h4>
              <p style="margin: 0; font-size: 12.5px; color: var(--text-muted);">${escapeHtml(o.description)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ════ 14. TECHNICAL APPENDIX ══════════════════════════════════════ -->
      <div id="sec-14" class="section-block" style="page-break-before: always;">
        <div class="section-header">
          <h2 class="section-title"><span class="sec-num">14.</span> Technical Appendix</h2>
        </div>
        <p>This appendix provides detailed engineering specifications, relational schemas, SQL DDL definitions, and payload contracts.</p>

        <h3>Complete Relational Schemas</h3>
        ${technicalAppendix.entities.map(e => `
          <h4 style="margin: 16px 0 6px 0; font-size: 13px; color: #1E293B;">Table: ${escapeHtml(e.name)}</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Data Type</th>
                <th>Constraints</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${(e.fields || []).map(f => `
                <tr>
                  <td><code>${escapeHtml(f.name)}</code></td>
                  <td><code>${escapeHtml(f.type)}</code></td>
                  <td>${escapeHtml(f.constraints || '-')}</td>
                  <td>${escapeHtml(f.description || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('')}

        <h3>Generated Relational SQL DDL</h3>
        <pre class="code-block"><code>${escapeHtml(technicalAppendix.sqlDdl || '-- No SQL DDL generated')}</code></pre>
      </div>

    </div>
  </div>

</body>
</html>`;
}
