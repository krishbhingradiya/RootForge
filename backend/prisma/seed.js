import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AI Solution Builder database...');

  // Clean old records for clean seed
  try {
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.approval.deleteMany();
    await prisma.task.deleteMany();
    await prisma.implementationPlan.deleteMany();
    await prisma.apiDesign.deleteMany();
    await prisma.databaseDesign.deleteMany();
    await prisma.uXDesign.deleteMany();
    await prisma.processNode.deleteMany();
    await prisma.processModel.deleteMany();
    await prisma.architectureEdge.deleteMany();
    await prisma.architectureNode.deleteMany();
    await prisma.architecture.deleteMany();
    await prisma.solution.deleteMany();
    await prisma.businessAnalysis.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.document.deleteMany();
    await prisma.artifactVersion.deleteMany();
    await prisma.exportJob.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
  } catch (e) {
    console.log('Clean table pass completed.');
  }

  // 1. Create Demo Organization
  const acmeOrg = await prisma.organization.create({
    data: {
      name: 'Acme Retail Global',
      industry: 'Retail & Consumer Goods'
    }
  });

  // 2. Create Administrator and System Users
  const adminEmail = (process.env.ADMIN_EMAIL || 'mgpro9090@gmail.com').trim().toLowerCase();
  const adminRawSecret = process.env.ADMIN_PASSWORD || 'RootForgeSecureAdmin@2026';
  const adminPassword = await bcrypt.hash(adminRawSecret, 10);
  const consultantPassword = await bcrypt.hash('Consultant@RootForge2026', 10);

  const demoAdmin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminPassword,
      name: 'RootForge Administrator',
      role: 'ADMIN',
      emailVerified: true,
      organizationId: acmeOrg.id
    }
  });

  const consultantUser = await prisma.user.create({
    data: {
      email: 'consultant@rootforge.com',
      passwordHash: consultantPassword,
      name: 'Marcus Vance (Principal Architect)',
      role: 'CONSULTANT',
      emailVerified: true,
      organizationId: acmeOrg.id
    }
  });

  const analystUser = await prisma.user.create({
    data: {
      email: 'analyst@rootforge.com',
      passwordHash: consultantPassword,
      name: 'Anita Desai (Senior Business Analyst)',
      role: 'ANALYST',
      emailVerified: true,
      organizationId: acmeOrg.id
    }
  });

  console.log('System users initialized.');

  // 3. Create Demo Workspace
  const demoWorkspace = await prisma.workspace.create({
    data: {
      id: 'ws-demo-customer-support',
      name: 'Customer Support Transformation',
      organizationId: acmeOrg.id,
      industry: 'Retail & Omnichannel Commerce',
      objective: 'Reduce manual customer support operations by 65% and eliminate ticket triage delays.',
      challenge: 'Customer support requests arrive through email, web forms and other channels. Agents manually categorize requests, assign departments and track resolutions. Management has limited real-time visibility.',
      targetUsers: 'Tier-1 & Tier-2 Support Specialists, Department Supervisors, Store Operations, Retail Shoppers',
      expectedOutcome: 'Automated intent classification, dynamic skill-based ticket routing, AI copilot responses, sub-hour turnaround time.',
      status: 'PLANNING',
      isDemo: true,
      createdById: demoAdmin.id
    }
  });

  console.log(`Demo workspace created: ${demoWorkspace.name}`);

  // 4. Seed Documents
  await prisma.document.createMany({
    data: [
      {
        workspaceId: demoWorkspace.id,
        filename: 'acme_support_sop_v2.pdf',
        originalName: 'Acme Retail - Tier-1 Support SOP v2.4.pdf',
        fileType: '.pdf',
        fileSize: 428000,
        status: 'ANALYZED',
        extractedText: 'Standard Operating Procedure: Incoming requests from customers are triaged within 4 hours. Priority 1 issues must be escalated to shift leads within 30 minutes. Channels supported: Web portal, direct support inbox, SMS notifications.'
      },
      {
        workspaceId: demoWorkspace.id,
        filename: 'channel_volume_q3_report.docx',
        originalName: 'Q3 Support Volume & Escalation Report.docx',
        fileType: '.docx',
        fileSize: 312000,
        status: 'ANALYZED',
        extractedText: 'Inbound breakdown: 54% order status and returns, 26% billing discrepancies, 14% product inquiries, 6% vendor warranty disputes. Average resolution time: 18.2 hours.'
      }
    ]
  });

  // 5. Seed Discovery Conversation
  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'Customer Support Discovery Session',
      messages: {
        create: [
          {
            role: 'assistant',
            content: `Welcome to the Discovery workspace for **${demoWorkspace.name}** [DEMO WORKSPACE].\n\nI have analyzed your objective: *"Reduce manual customer support operations by 65%"*. What is the current distribution of inbound volume across email, portal, chat, and phone channels?`
          },
          {
            role: 'user',
            content: 'Around 54% of tickets are order tracking and return inquiries via email and web forms, 26% are billing disputes, and the remaining 20% are store warranty edge cases.'
          },
          {
            role: 'assistant',
            content: `Excellent clarification. 54% order tracking represents high-frequency, low-complexity transactions ideally suited for straight-through AI automation. By deploying an AI classification gateway connected to your Shopify/ERP backend, we can auto-resolve order queries instantly while directing billing disputes to certified specialists.\n\nKey takeaway: Every stage remains advisory. You can inspect the generated Business Analysis and compare architecture options next.`,
            suggestedAction: 'View Business Analysis'
          }
        ]
      }
    }
  });

  // 6. Seed Business Analysis
  await prisma.businessAnalysis.create({
    data: {
      workspaceId: demoWorkspace.id,
      currentState: 'Customer support requests arrive through email, web forms and other channels. Agents manually categorize requests, assign departments and track resolutions. Management has limited real-time visibility and turnaround averages 18.2 hours.',
      futureState: 'An omnichannel intelligent triage platform where incoming inquiries are categorized within 3 seconds using zero-shot AI. Order status inquiries are resolved autonomously via ERP connectors, while complex escalations arrive pre-enriched with suggested resolution playbooks.',
      goals: JSON.stringify([
        'Achieve 65%+ automated straight-through resolution for order inquiries',
        'Reduce average first-response latency from 4.2 hours to under 3 minutes',
        'Provide real-time executive dashboard for SLA health and agent utilization',
        'Standardize resolution consistency using verified knowledge base citations',
        'Lower operational support cost per ticket by 40% in year one'
      ]),
      painPoints: JSON.stringify([
        'Manual classification bottlenecks: 30% of agent time spent reading and tagging tickets',
        'Misrouted tickets between Logistics, Billing, and Store Ops causing 2-day delays',
        'No unified customer timeline across separate CRM, Shopify, and inbox records',
        'Weekend and holiday volume spikes leading to SLA breaches and churn'
      ]),
      stakeholders: JSON.stringify([
        { role: 'VP Customer Experience', interest: 'CSAT scores, brand loyalty, cost control' },
        { role: 'Support Team Leads', interest: 'Real-time queue balancing, burnout reduction' },
        { role: 'Frontline Support Specialists', interest: 'Fewer repetitive tickets, ergonomic copilot UI' },
        { role: 'Enterprise IT & Security', interest: 'SOC-2 / GDPR compliance, encrypted API connectors' }
      ]),
      requirements: JSON.stringify([
        { id: 'REQ-01', type: 'Functional', text: 'Multi-channel automated ingestion of email and web form tickets with attachments' },
        { id: 'REQ-02', type: 'Functional', text: 'Zero-shot AI intent categorization and sentiment scoring with confidence threshold' },
        { id: 'REQ-03', type: 'Functional', text: 'ERP connector for automated order tracking lookup and refund eligibility check' },
        { id: 'REQ-04', type: 'Technical', text: 'Sub-second REST API response times and PostgreSQL relational persistence' },
        { id: 'REQ-05', type: 'Security', text: 'RBAC with ADMIN, CONSULTANT, ANALYST, and VIEWER privilege tiers' }
      ]),
      gaps: JSON.stringify([
        'No centralized business rule engine; triage rules exist only in PDF SOP documents',
        'Absence of an event streaming pipeline between web forms and ERP backends',
        'Missing automated escalation alerts when high-value VIP customers submit issues'
      ]),
      processIssues: JSON.stringify([
        'Handoff between Tier-1 and Billing requires manual email forwarding and re-verification',
        'Customer must repeatedly provide order number if ticket is reassigned',
        'No real-time telemetry to catch bottlenecked queues before SLA penalties trigger'
      ]),
      automationOpportunities: JSON.stringify([
        { title: 'Intelligent Inbound Triage', impact: 'High', effort: 'Low', saving: '75% triage time savings' },
        { title: 'Self-Service Order Tracking Bot', impact: 'High', effort: 'Medium', saving: '50% inbound ticket deflection' },
        { title: 'Automated Billing Credit Approvals', impact: 'Medium', effort: 'Low', saving: '90% refund delay reduction' },
        { title: 'Predictive Churn Risk Flagging', impact: 'High', effort: 'Medium', saving: '30% VIP customer retention boost' }
      ]),
      digitalMaturityScore: 68,
      improvementOpportunities: JSON.stringify([
        'Single pane of glass for multi-tier workflow coordination',
        'Automated closed-loop SMS/Email status updates to shoppers',
        'Continuous reinforcement learning from agent corrections'
      ]),
      status: 'APPROVED',
      version: 1
    }
  });

  // 7. Seed Solution Recommendation with Options A, B, C
  const options = [
    {
      id: 'OPTION_A',
      name: 'Workflow Rules Engine Automation',
      tagline: 'Streamline routing using rule-based filters and basic Zapier/Webhook triggers',
      complexity: 'Low',
      estimatedEffort: '6 - 8 Weeks',
      estimatedCost: '$60,000 - $85,000',
      businessImpact: 'Moderate (25-35% efficiency boost)',
      automationPotential: '35% Routine tasks',
      implementationRisk: 'Low',
      pros: ['Fastest time to value', 'Minimal change management', 'Low upfront investment'],
      cons: ['Cannot parse freeform natural language', 'Brittle to rule changes', 'No generative assistance']
    },
    {
      id: 'OPTION_B',
      name: 'AI-Assisted Support Platform (Recommended)',
      tagline: 'Balanced enterprise transformation pairing automated triage with human copilots',
      complexity: 'Medium',
      estimatedEffort: '12 - 14 Weeks',
      estimatedCost: '$160,000 - $210,000',
      businessImpact: 'High (65-75% operational acceleration)',
      automationPotential: '70% Straight-through processing',
      implementationRisk: 'Medium (Managed through staged rollout)',
      pros: ['Highest ROI ratio', 'Frontline empowerment with human-in-the-loop safety', 'Modern modular micro-architecture'],
      cons: ['Requires operator onboarding workshop', 'Requires clean historical training samples']
    },
    {
      id: 'OPTION_C',
      name: 'Full Autonomous Enterprise Overhaul',
      tagline: 'Complete re-platforming with autonomous agents and deep ERP core replacement',
      complexity: 'High',
      estimatedEffort: '24 - 32 Weeks',
      estimatedCost: '$480,000 - $650,000',
      businessImpact: 'Transformational (85%+ labor reduction)',
      automationPotential: '90%+ Autonomous operations',
      implementationRisk: 'High (Significant change resistance)',
      pros: ['Maximum theoretical efficiency', 'Eliminates all legacy technical debt', 'Market-defining moat'],
      cons: ['Extended timeline before first ROI', 'Substantial operational disruption', 'Heavy capital outlay']
    }
  ];

  await prisma.solution.create({
    data: {
      workspaceId: demoWorkspace.id,
      name: 'AI-Powered Customer Support Automation Platform',
      summary: 'A unified enterprise solution integrating omnichannel ticket ingestion, NLP intent classification, automated routing, an ergonomic operator copilot, and real-time executive transformation analytics.',
      businessValue: 'Delivers 3.2x resolution throughput, lowers cost per ticket by 40%, and reduces first-contact resolution time from hours to under 3 minutes.',
      keyCapabilities: JSON.stringify([
        'Omnichannel Ticket Ingestion (Email, Web Forms, REST API)',
        'Zero-Shot AI Intent & Sentiment Classification',
        'Dynamic Skill-Based Ticket Routing Matrix',
        'Operator Copilot with Generative Draft Responses & Citations',
        'ERP Integration for Automated Order & Refund Verification',
        'Real-Time SLA & Transformation Health Dashboard'
      ]),
      automationOpps: JSON.stringify([
        'Automated order status inquiry resolution without human touch',
        'Dynamic ticket prioritization based on sentiment and customer lifetime value',
        'Proactive notification delivery to shoppers upon shipping status updates'
      ]),
      aiOpps: JSON.stringify([
        'Semantic clustering of incoming inquiries to identify product defect trends',
        'Automated draft composition using approved company support tone',
        'Supervisor escalation anomaly detection before SLA breach occurs'
      ]),
      techStack: JSON.stringify({
        frontend: 'React 18, Vite, Responsive Enterprise CSS Design System',
        backend: 'Node.js, Express REST API, Prisma ORM, JWT Authentication',
        database: 'PostgreSQL / SQLite 3NF Relational Database',
        ai_services: 'Modular Provider Abstraction (Deterministic Demo Engine + OpenAI/Gemini)',
        integrations: 'Secure REST/Webhook Gateway for Shopify, Zendesk, and ERP backends'
      }),
      implementationApproach: 'Staged 5-Phase rollout: Phase 1 Architecture & Security, Phase 2 Core Ingestion Engine, Phase 3 AI Intelligence & Copilot UI, Phase 4 Integration & UAT, Phase 5 Production Cutover.',
      risks: JSON.stringify([
        { risk: 'User adoption inertia among legacy operators', mitigation: 'Intuitive ergonomic UI, gradual co-pilot introduction, and interactive training' },
        { risk: 'Data schema variance across incoming channels', mitigation: 'Strict ingress schema normalization with fallback manual validation queue' },
        { risk: 'Upstream legacy system API rate limits', mitigation: 'Asynchronous event queue with exponential backoff and batching' }
      ]),
      assumptions: JSON.stringify([
        'Operators utilize modern desktop web browsers',
        'Historical resolution logs are accessible for baseline knowledge retrieval',
        'Enterprise IT provides webhook access to ERP order events'
      ]),
      dependencies: JSON.stringify([
        'Authentication provider (JWT directory / SSO)',
        'Compute environment supporting Node.js runtime and relational database',
        'Access to upstream communication gateways (Email/Webhook/API)'
      ]),
      options: JSON.stringify(options),
      selectedOption: 'OPTION_B',
      status: 'APPROVED',
      version: 1
    }
  });

  // 8. Seed Architecture Canvas & Nodes
  const architecture = await prisma.architecture.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'Customer Support Target Architecture',
      highLevelDesign: 'Decoupled N-tier enterprise architecture featuring an omnichannel client layer, a centralized security API Gateway, an event-driven application cluster, an AI cognitive dispatcher, an ACID relational database, and bidirectional enterprise connectors.',
      lowLevelDesign: 'Express REST services enforce strict DTO validation and JWT token verification. Background tasks utilize non-blocking event loops. AI recommendations execute through a pluggable provider interface with fallback resilience.',
      integrationArch: 'Enterprise Webhook and REST API connectors interface with upstream CRM/ERP platforms. Secure outbound webhooks deliver asynchronous event notifications with retry mechanisms.',
      infrastructureArch: 'Containerized microservices deployable to AWS ECS/EKS, Azure Container Apps, or On-Premise Docker. Static assets hosted on geo-distributed CDN with edge SSL termination.',
      securityArch: 'OWASP Top 10 compliance: Bcrypt password hashing (10 rounds), HTTP-only JWTs, CORS origin whitelisting, parameterized SQL via Prisma ORM preventing SQL injection, and rate limiting on public endpoints.',
      deploymentArch: 'Automated CI/CD pipeline executing linting, unit tests, database migrations, and zero-downtime rolling container updates.',
      status: 'APPROVED',
      version: 1,
      nodes: {
        create: [
          {
            id: 'node-client',
            label: 'Executive & Operator Web App',
            type: 'CLIENT',
            tier: 'Client Layer',
            description: 'React SPA with responsive design system, real-time status feeds, and role-based views.',
            posX: 60,
            posY: 180,
            tech: 'React 18 / Vite / CSS Tokens'
          },
          {
            id: 'node-mobile',
            label: 'Supervisor Mobile / Tablet Portal',
            type: 'CLIENT',
            tier: 'Client Layer',
            description: 'Optimized touch viewport for rapid approvals and escalation monitoring.',
            posX: 60,
            posY: 320,
            tech: 'Responsive Web PWA'
          },
          {
            id: 'node-gateway',
            label: 'API Gateway & Security Proxy',
            type: 'GATEWAY',
            tier: 'Gateway Layer',
            description: 'Centralized ingress routing, JWT validation, rate limiting, and CORS enforcement.',
            posX: 320,
            posY: 250,
            tech: 'Express / Nginx / SSL'
          },
          {
            id: 'node-core-service',
            label: 'Core Workflow & Solution Engine',
            type: 'SERVICE',
            tier: 'Application Services',
            description: 'Business logic execution, state machine transitions, and permission enforcement.',
            posX: 580,
            posY: 140,
            tech: 'Node.js Express / Prisma'
          },
          {
            id: 'node-ai-service',
            label: 'AI & Automation Dispatcher',
            type: 'AI',
            tier: 'AI & Automation',
            description: 'Context synthesis, intent classification, recommendation generation, and prompt pipeline.',
            posX: 580,
            posY: 360,
            tech: 'Pluggable AI Service Provider'
          },
          {
            id: 'node-database',
            label: 'Transactional Relational Database',
            type: 'DATABASE',
            tier: 'Persistence',
            description: 'ACID-compliant storage for users, workspaces, solutions, artifacts, and audit logs.',
            posX: 860,
            posY: 140,
            tech: 'PostgreSQL / SQLite 3NF'
          },
          {
            id: 'node-integrations',
            label: 'Enterprise Legacy & Cloud Integrations',
            type: 'INTEGRATION',
            tier: 'Integrations',
            description: 'Bidirectional connectors for ERP, CRM (Salesforce/Zendesk), email servers, and webhooks.',
            posX: 860,
            posY: 360,
            tech: 'REST / Webhooks / OAuth2'
          }
        ]
      },
      edges: {
        create: [
          { sourceId: 'node-client', targetId: 'node-gateway', label: 'HTTPS / REST', protocol: 'REST' },
          { sourceId: 'node-mobile', targetId: 'node-gateway', label: 'HTTPS / REST', protocol: 'REST' },
          { sourceId: 'node-gateway', targetId: 'node-core-service', label: 'Internal Proxy', protocol: 'REST' },
          { sourceId: 'node-gateway', targetId: 'node-ai-service', label: 'Inference Calls', protocol: 'REST' },
          { sourceId: 'node-core-service', targetId: 'node-database', label: 'Prisma Queries', protocol: 'SQL' },
          { sourceId: 'node-ai-service', targetId: 'node-database', label: 'Context Retrieval', protocol: 'SQL' },
          { sourceId: 'node-core-service', targetId: 'node-integrations', label: 'Webhooks & Sync', protocol: 'REST' }
        ]
      }
    }
  });

  // 9. Seed Process Model
  await prisma.processModel.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'Target Customer Support Triage & Resolution Process',
      description: 'Streamlined process model showing customer touchpoints, automated AI triage, decision gates, operator co-pilot interaction, and final resolution telemetry.',
      type: 'WORKFLOW',
      status: 'APPROVED',
      version: 1,
      nodes: {
        create: [
          {
            stepOrder: 1,
            label: 'Customer Request Ingestion',
            type: 'START',
            actor: 'Customer / Channel',
            description: 'Inbound request arrives via portal, email, or API. System generates tracking UUID and acknowledges receipt.'
          },
          {
            stepOrder: 2,
            label: 'AI Intent & Sentiment Classification',
            type: 'AUTOMATION',
            actor: 'AI Engine',
            description: 'Natural language analysis parses intent, urgency, sentiment score, and required skill tag.',
            condition: 'Confidence >= 80%'
          },
          {
            stepOrder: 3,
            label: 'Priority & Risk Decision Gate',
            type: 'DECISION',
            actor: 'System Rules',
            description: 'Evaluates priority and business risk thresholds to determine routing channel.',
            condition: 'Evaluate: High vs Normal Priority'
          },
          {
            stepOrder: 4,
            label: 'Manager Approval & Escalation',
            type: 'APPROVAL',
            actor: 'Supervisor',
            description: 'High-risk or compliance-critical request flagged for rapid supervisor sign-off before dispatch.',
            condition: 'If High Priority / VIP'
          },
          {
            stepOrder: 5,
            label: 'Skill-Based Operator Routing',
            type: 'STEP',
            actor: 'System Dispatcher',
            description: 'Standard request dispatched directly to frontline queue with AI-drafted resolution recommendation.',
            condition: 'If Normal Priority'
          },
          {
            stepOrder: 6,
            label: 'Copilot-Assisted Operator Resolution',
            type: 'STEP',
            actor: 'Frontline Operator',
            description: 'Operator reviews AI suggestion, adjusts parameters if needed, and executes resolution.',
            condition: 'Human-in-the-Loop Sign-off'
          },
          {
            stepOrder: 7,
            label: 'Stakeholder Notification & Survey',
            type: 'NOTIFICATION',
            actor: 'System',
            description: 'Automated resolution notification dispatched to customer with feedback rating link.',
            condition: 'Immediate'
          },
          {
            stepOrder: 8,
            label: 'Ticket Closed & SLA Telemetry Logged',
            type: 'END',
            actor: 'Transformation Database',
            description: 'Transaction marked completed, SLA duration recorded, model accuracy feedback updated.',
            condition: 'Final State'
          }
        ]
      }
    }
  });

  // 10. Seed UX Wireframe Screens
  await prisma.uXDesign.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'Customer Support Transformation UI Wireframes',
      status: 'APPROVED',
      version: 1,
      designTokens: JSON.stringify({
        palette: {
          background: '#FAF8F5 (Warm White)',
          cardBg: '#FFFFFF (Clean Ivory)',
          textPrimary: '#1F242D (Charcoal)',
          textMuted: '#64748B (Slate)',
          accent: '#D97706 (Muted Amber)',
          success: '#059669 (Muted Green)',
          border: '#E2E8F0 (Subtle Slate)'
        },
        typography: 'Plus Jakarta Sans (UI) & JetBrains Mono (Codes)'
      }),
      screens: JSON.stringify([
        {
          id: 'screen-dashboard',
          name: 'Executive Transformation Dashboard',
          description: 'High-level operational overview showcasing throughput, active bottlenecks, AI triage accuracy, and SLA health.',
          layout: 'Grid of 4 Metric Stat Cards, Transformation Health Ring, Recent High-Priority Escalations Table, AI Confidence Distribution Bar'
        },
        {
          id: 'screen-workflow',
          name: 'Operator Workspace & Case Processing',
          description: 'Split-view interface designed for rapid request handling with AI Copilot assistance on the right.',
          layout: 'Left pane: Active case list with priority badges; Center: Request detail, customer history, timeline; Right: AI Copilot recommendations, 1-click action buttons'
        },
        {
          id: 'screen-admin',
          name: 'Supervisory & Configuration Console',
          description: 'Management controls for routing rules, team capacity allocations, threshold parameters, and audit log inspection.',
          layout: 'Top tab navigation (Users, Workspaces, Rules, Logs), Data table with filter chips, Slide-over drawer for entity editing'
        },
        {
          id: 'screen-analytics',
          name: 'Transformation & SLA Analytics',
          description: 'Historical performance reporting, cycle time trends, operator efficiency benchmarks, and cost-savings tracking.',
          layout: 'Date-range picker, Multi-series timeline chart (Resolution Time vs Target SLA), Breakdown by category, Export to CSV/PDF'
        }
      ])
    }
  });

  // 11. Seed Database Design & Schema
  await prisma.databaseDesign.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'Relational Data Model & ERD',
      status: 'APPROVED',
      version: 1,
      entities: JSON.stringify([
        {
          name: 'User',
          description: 'Internal platform users, roles, and credential references',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Unique user identifier' },
            { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Corporate email' },
            { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Full name' },
            { name: 'role', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'ADMIN, CONSULTANT, ANALYST, VIEWER' }
          ]
        },
        {
          name: 'Customer',
          description: 'External clients submitting requests',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Customer UUID' },
            { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Contact or company name' },
            { name: 'email', type: 'VARCHAR(255)', constraints: 'NOT NULL, INDEX', description: 'Contact email' },
            { name: 'tier', type: 'VARCHAR(20)', constraints: 'DEFAULT STANDARD', description: 'STANDARD, PREMIUM, ENTERPRISE' }
          ]
        },
        {
          name: 'Ticket',
          description: 'Core operational transaction or support request',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Ticket UUID' },
            { name: 'ticketNumber', type: 'VARCHAR(30)', constraints: 'UNIQUE, NOT NULL', description: 'TCK-1049' },
            { name: 'customerId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Customer.id' },
            { name: 'assignedUserId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY', description: 'References User.id' },
            { name: 'status', type: 'VARCHAR(30)', constraints: 'NOT NULL, DEFAULT OPEN', description: 'OPEN, IN_PROGRESS, RESOLVED' },
            { name: 'priority', type: 'VARCHAR(20)', constraints: 'NOT NULL, DEFAULT MEDIUM', description: 'LOW, MEDIUM, HIGH, URGENT' },
            { name: 'aiClassification', type: 'VARCHAR(100)', constraints: '', description: 'AI inferred category' },
            { name: 'aiConfidence', type: 'FLOAT', constraints: 'CHECK(aiConfidence BETWEEN 0 AND 1)', description: 'Confidence score' }
          ]
        },
        {
          name: 'Department',
          description: 'Functional routing divisions',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Department UUID' },
            { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Department title' },
            { name: 'slaHours', type: 'INTEGER', constraints: 'DEFAULT 24', description: 'SLA target hours' }
          ]
        }
      ]),
      relations: JSON.stringify([
        { from: 'Ticket.customerId', to: 'Customer.id', type: 'Many-to-One' },
        { from: 'Ticket.assignedUserId', to: 'User.id', type: 'Many-to-One (Optional)' },
        { from: 'Ticket.departmentId', to: 'Department.id', type: 'Many-to-One' }
      ]),
      sqlSchema: `-- SQL DDL for Customer Support Automation
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  tier VARCHAR(20) DEFAULT 'STANDARD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sla_hours INTEGER DEFAULT 24
);

CREATE TABLE tickets (
  id VARCHAR(36) PRIMARY KEY,
  ticket_number VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'OPEN' NOT NULL,
  priority VARCHAR(20) DEFAULT 'MEDIUM' NOT NULL,
  ai_classification VARCHAR(100),
  ai_confidence FLOAT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);`,
      prismaSchema: `model Ticket {
  id               String      @id @default(uuid())
  ticketNumber     String      @unique
  customerId       String
  customer         Customer    @relation(fields: [customerId], references: [id])
  subject          String
  status           String      @default("OPEN")
  priority         String      @default("MEDIUM")
  aiClassification String?
  aiConfidence     Float?
  createdAt        DateTime    @default(now())
}`
    }
  });

  // 12. Seed API Blueprint
  await prisma.apiDesign.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'Customer Support REST API Blueprint',
      baseUrl: '/api/v1',
      authType: 'Bearer JWT (HTTP Header)',
      status: 'APPROVED',
      version: 1,
      endpoints: JSON.stringify([
        {
          method: 'POST',
          endpoint: '/api/v1/tickets',
          description: 'Ingests new inbound support inquiry and initiates asynchronous AI triage.',
          parameters: 'None (Body payload)',
          requestBody: '{\n  "customerId": "cust_9812",\n  "subject": "Billing discrepancy on invoice #8821",\n  "description": "Double charged for recurring enterprise seat license",\n  "channel": "WEB_PORTAL"\n}',
          responseBody: '{\n  "ticketId": "tck_7731",\n  "ticketNumber": "TCK-1049",\n  "status": "OPEN",\n  "aiClassification": "Billing / Invoice Dispute",\n  "aiConfidence": 0.94,\n  "assignedDepartment": "Accounts Receivable"\n}',
          authentication: 'Bearer Token or Ingestion API Key'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/tickets',
          description: 'Returns filtered list of active requests with pagination and priority triage filters.',
          parameters: '?status=OPEN&priority=HIGH&page=1&limit=25',
          requestBody: 'None',
          responseBody: '{\n  "data": [\n    {\n      "id": "tck_7731",\n      "ticketNumber": "TCK-1049",\n      "subject": "Billing discrepancy...",\n      "priority": "HIGH",\n      "slaRemainingMinutes": 45\n    }\n  ],\n  "total": 42,\n  "page": 1\n}',
          authentication: 'Bearer Token (Role: CONSULTANT, ANALYST, ADMIN)'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/tickets/:id',
          description: 'Retrieves complete ticket detail with conversation timeline and AI suggestion.',
          parameters: ':id (UUID)',
          requestBody: 'None',
          responseBody: '{\n  "id": "tck_7731",\n  "subject": "Billing discrepancy...",\n  "aiRecommendation": {\n    "suggestedAction": "Issue credit memo for duplicate line item",\n    "confidence": 0.91,\n    "policyReference": "FIN-POL-402"\n  }\n}',
          authentication: 'Bearer Token'
        },
        {
          method: 'POST',
          endpoint: '/api/v1/tickets/:id/resolve',
          description: 'Closes ticket with resolution notes and triggers automated closure confirmation.',
          parameters: ':id (UUID)',
          requestBody: '{\n  "resolutionCode": "REFUND_ISSUED",\n  "summary": "Processed credit memo #CM-901 for $120.00",\n  "notifyCustomer": true\n}',
          responseBody: '{\n  "success": true,\n  "ticketId": "tck_7731",\n  "status": "RESOLVED"\n}',
          authentication: 'Bearer Token'
        }
      ])
    }
  });

  // 13. Seed Implementation Plan & Tasks
  const plan = await prisma.implementationPlan.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'Customer Support Transformation Implementation Roadmap',
      estimatedDurationWeeks: 12,
      estimatedCost: '$160,000 - $210,000',
      methodology: 'Agile / Scrum (6 Sprints across 5 Execution Phases)',
      status: 'APPROVED',
      version: 1,
      phases: JSON.stringify([
        { name: 'Phase 1: Discovery & Architecture Alignment', durationWeeks: 2, focus: 'Stakeholder sign-off, API contract freeze, security review' },
        { name: 'Phase 2: Core Platform & Ingestion Engine', durationWeeks: 3, focus: 'Data models, multi-channel intake, authentication and RBAC' },
        { name: 'Phase 3: AI Intelligence & Copilot Workspace', durationWeeks: 3, focus: 'Automated intent triage, routing rules, operator copilot UI' },
        { name: 'Phase 4: Integration & End-to-End Validation', durationWeeks: 2, focus: 'Enterprise system connectors, UAT testing, edge cases' },
        { name: 'Phase 5: Staged Rollout & Operational Handoff', durationWeeks: 2, focus: 'Production cutover, operator training, telemetry verification' }
      ]),
      tasks: {
        create: [
          {
            phaseName: 'Phase 1: Discovery & Architecture Alignment',
            title: 'Finalize Classification Taxonomy with Tier-1 Leads',
            description: 'Confirm ticket categorization hierarchy and escalation rules.',
            assignedRole: 'Lead Business Analyst',
            durationWeeks: 1.0,
            sprint: 'Sprint 1',
            status: 'COMPLETED',
            riskLevel: 'LOW'
          },
          {
            phaseName: 'Phase 1: Discovery & Architecture Alignment',
            title: 'Architecture & Security Perimeter Sign-off',
            description: 'Review JWT security, data flow diagrams, and API boundaries with Enterprise Security.',
            assignedRole: 'Principal Architect',
            durationWeeks: 1.0,
            sprint: 'Sprint 1',
            status: 'COMPLETED',
            riskLevel: 'MEDIUM'
          },
          {
            phaseName: 'Phase 2: Core Platform & Ingestion Engine',
            title: 'Deploy PostgreSQL 3NF Schema & Ingestion Endpoints',
            description: 'Run Prisma migrations, configure indexes and API endpoints.',
            assignedRole: 'Backend Engineer',
            durationWeeks: 1.5,
            sprint: 'Sprint 2',
            status: 'IN_PROGRESS',
            riskLevel: 'LOW'
          },
          {
            phaseName: 'Phase 3: AI Intelligence & Copilot Workspace',
            title: 'Configure AI Intent Triage & Copilot Workspace',
            description: 'Deploy zero-shot intent classifier and real-time operator drafting copilot.',
            assignedRole: 'AI / ML Engineer',
            durationWeeks: 2.0,
            sprint: 'Sprint 3',
            status: 'TODO',
            riskLevel: 'HIGH'
          },
          {
            phaseName: 'Phase 4: Integration & End-to-End Validation',
            title: 'Conduct Pilot UAT with 25 Support Operators',
            description: 'Simulate 500 historical tickets through the automated triage workflow.',
            assignedRole: 'QA & Pilot Team',
            durationWeeks: 1.5,
            sprint: 'Sprint 4',
            status: 'TODO',
            riskLevel: 'MEDIUM'
          }
        ]
      }
    }
  });

  // 14. Seed Collaboration (Comments, Approvals, Activity Logs)
  await prisma.comment.createMany({
    data: [
      {
        workspaceId: demoWorkspace.id,
        artifactType: 'SOLUTION',
        userId: consultantUser.id,
        content: 'Option B is clearly the optimal path for Acme Retail. It provides 70% straight-through automation without the massive operational disruption of Option C.',
        mentions: JSON.stringify(['elena@aisolutionbuilder.dev', 'anita@aisolutionbuilder.dev'])
      },
      {
        workspaceId: demoWorkspace.id,
        artifactType: 'ARCHITECTURE',
        userId: analystUser.id,
        content: 'I verified the node connections between Gateway and AI service. Looks rock solid for the Phase 1 pilot.',
        mentions: null
      }
    ]
  });

  await prisma.approval.createMany({
    data: [
      {
        workspaceId: demoWorkspace.id,
        artifactType: 'ANALYSIS',
        userId: demoAdmin.id,
        status: 'APPROVED',
        comments: 'Approved business requirements and automation target metrics.',
        approvedAt: new Date()
      },
      {
        workspaceId: demoWorkspace.id,
        artifactType: 'SOLUTION',
        userId: consultantUser.id,
        status: 'APPROVED',
        comments: 'Endorsed Option B architecture strategy.',
        approvedAt: new Date()
      }
    ]
  });

  await prisma.activityLog.createMany({
    data: [
      {
        workspaceId: demoWorkspace.id,
        userId: demoAdmin.id,
        userName: 'Elena Rostova',
        action: 'CREATED',
        details: 'Created Customer Support Transformation workspace'
      },
      {
        workspaceId: demoWorkspace.id,
        userId: demoAdmin.id,
        userName: 'Elena Rostova',
        action: 'APPROVED',
        details: 'Approved Business Analysis specifications'
      },
      {
        workspaceId: demoWorkspace.id,
        userId: consultantUser.id,
        userName: 'Marcus Vance',
        action: 'APPROVED',
        details: 'Approved Recommended Solution Architecture'
      }
    ]
  });

  console.log('Seeding complete! Database is fully populated with demo workspace and accounts.');
}

main()
  .catch((e) => {
    console.error('Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
