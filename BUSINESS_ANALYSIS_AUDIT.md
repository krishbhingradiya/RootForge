# BUSINESS ANALYSIS & DIAGNOSTICS MODULE: ARCHITECTURAL AUDIT

**Project:** RootForge Enterprise Solution Builder  
**Stage:** Stage 2 — Business Analysis & Diagnostics  
**Date:** September 2026  
**Auditor:** Antigravity AI  

---

## 1. Executive Summary & Objective

The objective of this audit is to conduct an exhaustive diagnostic inspection of the existing **Business Analysis & Diagnostics** stage in RootForge, identifying strengths, structural gaps, and failure modes in data modeling, evidence provenance, AI inference separation, score explainability, and stage handoffs.

The goal is to harden this module so that:
1. AI inference is **never** presented as confirmed fact.
2. Every goal, pain point, requirement, and opportunity carries unambiguous **provenance and evidence references**.
3. Target metrics (e.g. "60% reduction") are classified strictly as **targets**, never as achieved baselines.
4. Requirements include full enterprise metadata: `id`, `type`, `title`, `description`, `priority`, `status`, `source`, `classification`, `confidence`, `dependencies`, `acceptanceCriteria`, `validationStatus`, and `"why"` rationale.
5. Assessment scores (Digital Maturity, AI Readiness, Solution Readiness, etc.) are **explainable with dimension breakdowns, evidence, and missing information**.
6. Open questions and assumptions are tracked as distinct, first-class entities.
7. Discovery → Business Analysis → Solution Builder handoffs are strictly structured and workspace-isolated.

---

## 2. Existing Frontend Flow (`BusinessAnalysisPage.jsx`)

### Components & State
- Located at [frontend/src/pages/analysis/BusinessAnalysisPage.jsx](file:///e:/Project/rootforge%202/rootforge/frontend/src/pages/analysis/BusinessAnalysisPage.jsx).
- State: `analysis`, `loading`, `generating`, `isEditing`, `saving`, `formData`.
- Loads persisted analysis on mount via `api.getAnalysis(id)`.
- If no analysis exists, renders an initial empty state with a "Synthesize Business Analysis" button.
- If analysis exists, renders:
  1. **Top Action Bar:** Status badge, Version badge, Edit button, Regenerate button, Approve button, and "Continue to Solution Builder" button.
  2. **Digital Maturity Assessment Banner:** Single numeric circular score (e.g. 68/100) with a brief static subtitle.
  3. **Current State vs Future State Comparison:** Two side-by-side cards with text descriptions.
  4. **Strategic Goals & Core Pain Points:** Two side-by-side cards rendering unadorned bullet lists of strings.
  5. **Automation Opportunities Table:** 4-column table (`Initiative Candidate`, `Impact`, `Effort`, `Projected Value / Savings`).
  6. **System Requirements Matrix:** 3-column table (`Req ID`, `Classification`, `Specification`).

### Frontend Strengths
- Clean enterprise styling conforming to the RootForge design system (amber accents, card containers, badge classes, responsive grid).
- Built-in inline editing mode (`isEditing`) allowing users to edit and save fields back to the server.
- Formal approval workflow (`handleApprove`) transitioning status to `APPROVED` and navigating to Solution Builder.
- Fast loading (<50ms) using persisted SQLite analysis without triggering re-inference on page load.

### Frontend Weaknesses & Gaps
1. **No Evidence or Provenance Indicators:** No source badges (`[CONFIRMED]`, `[DISCOVERY]`, `[DOCUMENT]`, `[AI INFERENCE]`, `[UNKNOWN]`).
2. **No Requirement Detail View:** Requirements table does not open a drawer/modal; fields like `acceptanceCriteria`, `dependencies`, `validationStatus`, and `rationale` are absent.
3. **No Traceability Chain ("Why"):** Users cannot see why a requirement was generated or which discovery dialogue / document snippet produced it.
4. **No Score Breakdown / Explainability:** Digital Maturity is a flat integer without dimension scoring, rationale, or missing information indicators. Other scores (AI Readiness, Solution Readiness) are not displayed or explainable.
5. **Missing Sections:** No Open Questions section, no Assumptions section, no Recommendations section (distinct from requirements), and no Validation Summary banner.
6. **No Target vs Baseline Distinction:** Targets like "60% reduction" appear inside goal strings without being flagged as targets vs current performance.

---

## 3. Existing Backend Flow (`analysis.routes.js`)

### Endpoints
- `GET /api/workspaces/:id/analysis`: Authenticates user, verifies workspace tenant access via `assertWorkspaceAccess`, retrieves the latest `BusinessAnalysis` record for the workspace.
- `POST /api/workspaces/:id/analysis`: Verifies write access via `assertWorkspaceWriteAccess`, calls `getWorkspaceContext(id, user)`, invokes `aiService.analyzeBusinessContext(context)`, increments version number, stores new record in Prisma, logs `ArtifactVersion` snapshot, logs `ActivityLog`, and updates `Workspace.status` to `'ANALYSIS'`.
- `PATCH /api/workspaces/:id/analysis`: Updates existing analysis fields, logs `ActivityLog`.
- `POST /api/workspaces/:id/analysis/approve`: Updates status to `'APPROVED'`, creates `Approval` record, logs `ActivityLog`.

### Backend Strengths
- Tenant isolation enforced via `authorization.service.js` (`assertWorkspaceAccess`, `assertWorkspaceWriteAccess`).
- Proper version snapshotting in `ArtifactVersion` table on each generation/regeneration.
- Safe activity logging for audit trails.
- Clean error propagation through `handleRouteError`.

### Backend Weaknesses & Gaps
- The route serializes rich data into legacy flat JSON string fields (`goals: JSON.stringify(...)`, `requirements: JSON.stringify(...)`).
- Does not persist or return first-class structured sections: `executiveSummary`, `assessmentScores`, `strategicGoals`, `operationalPainPoints`, `requirementsData`, `openQuestions`, `assumptions`, `recommendations`, `evidenceReferences`, `currentOperatingContext`, `validationSummary`.
- Approval endpoint does not validate if blocking open questions or unvalidated assumptions exist before approval.

---

## 4. Existing Database Entities (`schema.prisma`)

### Current `BusinessAnalysis` Model
```prisma
model BusinessAnalysis {
  id                       String    @id @default(cuid())
  workspaceId              String
  workspace                Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  currentState             String
  futureState              String
  goals                    String    // JSON array
  painPoints               String    // JSON array
  stakeholders             String    // JSON array
  requirements             String    // JSON array
  gaps                     String    // JSON array
  processIssues            String    // JSON array
  automationOpportunities  String    // JSON array
  digitalMaturityScore     Int       @default(65)
  improvementOpportunities String    // JSON array
  status                   String    @default("DRAFT") // DRAFT, REVIEW, APPROVED
  version                  Int       @default(1)
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}
```

### Assessment
- The model uses SQLite text columns to store serialized JSON strings.
- Extending this model with additional optional columns (`executiveSummary`, `assessmentScores`, `strategicGoals`, `operationalPainPoints`, `requirementsData`, `openQuestions`, `assumptions`, `recommendations`, `evidenceReferences`, `currentOperatingContext`, `validationSummary`, `model`) is 100% non-breaking.
- Existing records can continue to use their current columns, while new or regenerated analyses populate both the legacy and enhanced columns.

---

## 5. Existing AI Generation Pipeline & Prompt

### Prompt Builder (`analyzeBusinessContext.prompt.js`)
- System prompt includes `FACT_VS_INFERENCE_RULES`, prompt injection defense, and output formatting.
- Injects Sections:
  1. Workspace Metadata
  2. Discovery Context (user confirmed facts, user corrections, raw dialogue statements)
  3. Uploaded Document Context (bounded to 12,000 characters)
  4. Current Business Context (prior draft if re-analyzing)
  5. Required Output Format:
     - `currentState`: string
     - `futureState`: string
     - `goals`: array of strings
     - `painPoints`: array of strings
     - `stakeholders`: array of `{ role, interest }`
     - `requirements`: array of `{ id, type, text }`
     - `gaps`: array of strings
     - `processIssues`: array of strings
     - `automationOpportunities`: array of `{ title, impact, effort, saving }`
     - `digitalMaturityScore`: integer
     - `improvementOpportunities`: array of strings

### Weaknesses in Existing Prompt & Schema
1. **Primitive Requirements Schema:** Only requires `{ id, type, text }`. Lacks `title`, `description`, `priority`, `status`, `source`, `classification`, `confidence`, `dependencies`, `acceptanceCriteria`, `validationStatus`, `rationale`.
2. **Unstructured Goals and Pain Points:** Expected as flat arrays of strings without baseline, target, measurement method, evidence, or classification.
3. **No Explainable Scoring:** Only prompts for a single scalar `digitalMaturityScore` without dimensions, evidence, or missing data indicators.
4. **Missing Open Questions:** The prompt does not ask Gemini to synthesize or surface open questions requiring stakeholder validation.
5. **Missing Assumptions:** Does not prompt for explicit technical or operational assumptions.
6. **No Separation of Recommendations:** Recommendations are either lost or mingled with requirements.
7. **Current State Conflation:** Does not segment current state into confirmed baseline facts vs AI inferences vs unknowns.

---

## 6. Existing Discovery → Business Analysis Handoff

### `workspaceContext.service.js`
- `getWorkspaceContext(workspaceId, user)` gathers:
  - `workspace`: metadata
  - `documentContext`: extracted text and source references from uploaded documents
  - `discovery`: dialogue statements, userConfirmedFacts, userCorrections, discoveredGoals, discoveredPainPoints, discoveredConstraints, openQuestions
  - `businessAnalysis`: latest persisted analysis if present
- **Bug/Weakness in Discovery Context Query:**
  In `workspaceContext.service.js` line 364:
  ```javascript
  conversations: {
    where: { isArchived: false },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { lastMessageAt: 'desc' },
    take: 1
  }
  ```
  It picks the most recent conversation across all stages without filtering for `stage: 'discovery'`. If a user recently chatted in the "analysis" stage or "general" stage, `conversations[0]` might not be the Discovery conversation!
  **Fix:** Specifically query for `stage: 'discovery'` conversations (or include discovery conversations explicitly) so that all discovery statements and facts are reliably delivered to the analysis prompt.

---

## 7. Existing Business Analysis → Solution Builder Handoff

### `recommendSolutions.prompt.js`
- Inspects `context.businessAnalysis`.
- Parses `goals`, `painPoints`, `requirements`, `automationOpportunities`.
- Maps `goals` as `goals.map(g => \`  * \${g}\`)`. If `g` becomes an object, it would render `* [object Object]`.
- **Fix:** Update `recommendSolutions.prompt.js` to handle both rich objects (`g.goal || g.text || g.title`) and strings, and pass forward the rich requirements, constraints, assumptions, and open questions into the Solution Builder context.

---

## 8. Files to Change vs Files NOT to Change

### Files That MUST Be Changed
1. `backend/prisma/schema.prisma`: Add optional rich fields to `BusinessAnalysis` model.
2. `backend/src/ai/schemas/businessAnalysis.schema.js`: Update schema to define and validate the canonical structured model while maintaining backward compatibility.
3. `backend/src/ai/schemaValidator.js`: Update `validateBusinessAnalysis` to support rich goals, pain points, requirements, scores, open questions, assumptions, and recommendations with flexible type checking.
4. `backend/src/ai/prompts/user/analyzeBusinessContext.prompt.js`: Overhaul prompt instructions to enforce the 8-class classification, source provenance, target vs baseline, score breakdown, requirements engine, open questions, and assumptions.
5. `backend/src/ai/providers/demoProvider.js`: Update `demoProvider.analyzeBusinessContext` to output the rich canonical structure for offline/demo mode and deterministic baseline tests.
6. `backend/src/services/workspaceContext.service.js`: Fix discovery conversation stage resolution and enrich discovery context handoff.
7. `backend/src/routes/analysis.routes.js`: Update route to persist and return both canonical and legacy fields, and return rich metadata.
8. `backend/src/ai/prompts/user/recommendSolutions.prompt.js`: Upgrade upstream Business Analysis consumption to support rich objects and forward evidence/assumptions.
9. `frontend/src/pages/analysis/BusinessAnalysisPage.jsx`: Upgrade UI to render classification badges, evidence indicator drawer, requirement detail drawer, score explainability breakdown, open questions, assumptions, recommendations, and validation summary banner.
10. `frontend/src/context/translations.js`: Add localized labels for classification types, requirement drawer, score dimensions, and validation summary.

### Files That Must NOT Be Changed
- `backend/src/ai/providers/geminiProvider.js` (working Gemini client, do not alter)
- `backend/src/ai/providers/providerRouter.js` (working dispatcher, do not alter)
- `backend/src/ai/relevanceGuard.js` (working Discovery guardrails)
- `frontend/src/components/ai/ChatVoiceControl.jsx` (hardened voice system)
- `backend/src/services/transcription.service.js` (hardened voice STT)
- Existing navigation, auth routes, export routes, collaboration routes.

---

## 9. Next Steps
1. Create `implementation_plan.md` detailing the exact technical specifications and changes.
2. Wait for user approval.
3. Execute the implementation across backend schema, AI prompts, validators, routes, and frontend UI.
4. Author comprehensive test suite `test_business_analysis_hardening.js` (20+ assertions).
5. Run all regression suites and the production frontend build.
6. Compile `BUSINESS_ANALYSIS_HARDENING_REPORT.md` and update `BUILD.md`.
