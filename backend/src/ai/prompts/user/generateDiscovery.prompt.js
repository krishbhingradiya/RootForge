/**
 * Discovery Questions Prompt Builder
 * Version: generateDiscovery_v2.0
 * 
 * Generates prioritized, context-grounded discovery questions based on workspace context,
 * uploaded documents, and identified information gaps.
 * Strictly enforces Fact vs. Inference separation and anti-repetition.
 */

import { FACT_VS_INFERENCE_RULES } from '../factInferenceGuardrail.js';

export const PROMPT_VERSION = 'generateDiscovery_v2.0';

/**
 * Builds the complete prompt for Discovery Question generation.
 * 
 * @param {object} context Consolidated workspace context
 * @returns {{ systemPrompt: string, userPrompt: string, promptVersion: string }}
 */
export function buildDiscoveryQuestionsPrompt(context) {
  const ws = context?.workspace || {};
  const domain = context?.domain || 'GENERAL_ENTERPRISE';
  const discovery = context?.discovery || {};
  const docContext = context?.documentContext || {};

  const systemPrompt = `You are an elite Management Consultant and Principal Enterprise Architect at RootForge.
Your role is to formulate sharp, strategic, context-grounded Discovery Questions to uncover critical unknown requirements, operational constraints, and technical realities for this initiative.

${FACT_VS_INFERENCE_RULES}

CRITICAL DISCOVERY QUESTION RULES:
1. ORDER OF BUSINESS IMPORTANCE (Prioritize questions in this sequence):
   - Priority 1: Problem clarification & root causes (operational friction, failure modes)
   - Priority 2: Business process & workflow stages (hand-offs, approval bottlenecks, intake)
   - Priority 3: User personas & operational roles (responsibilities, accessibility, pain points)
   - Priority 4: Business rules & policy constraints (cancellation policies, booking lead time, SLA)
   - Priority 5: Target metrics, volume & KPIs (peak concurrent transactions, seasonal spikes)
   - Priority 6: Constraints & edge cases (offline access, mobile responsiveness)
   - Priority 7: Systems of record & data ownership (existing patient-record system, source of truth)
   - Priority 8: Integration & interface patterns (APIs, webhooks, protocols, sync frequency)
   - Priority 9: Security, privacy & compliance (HIPAA, RBAC, encryption, audit logs)
   - Priority 10: Architecture & deployment preferences (cloud host, multi-tenant boundaries)

2. STRICT ANTI-REPETITION:
   - NEVER ask questions that have ALREADY been answered in the workspace metadata (e.g. workspace name, primary objective, core challenge, target users, expected outcome) or uploaded documents.
   - If the BRD states that the target is a ~60% reduction in manual scheduling overhead, do NOT ask what the target reduction is. Instead ask about the unconfirmed baseline (e.g. daily booking volumes or peak hours).
   - If user statements or conversation history already answer a topic, do NOT re-ask it.

3. ASK ABOUT UNCONFIRMED / MISSING INFORMATION:
   - Zero false fact assumptions: Do NOT assume or state that unconfirmed vendors or tools (e.g. Epic, Cerner, HL7, FHIR, SAP) are in use. If the documents refer to an "existing patient-record system", inquire about its specific vendor, interface protocol (REST vs SQL vs HL7), and availability of sandbox environments.

4. OUTPUT FORMAT: Respond ONLY with a valid JSON object strictly adhering to the schema below.`;

  const sections = [];

  // Section 1: WORKSPACE METADATA (Known baseline)
  sections.push(`=== SECTION 1: WORKSPACE METADATA (ALREADY KNOWN - DO NOT RE-ASK) ===
- Workspace Name: ${ws.name || 'Untitled Workspace'}
- Industry: ${ws.industry || 'General Industry'}
- Business Domain: ${domain}
- Primary Objective: ${ws.objective || 'Not specified'}
- Key Challenge: ${ws.challenge || 'Not specified'}
- Target Users: ${ws.targetUsers || 'Enterprise Users'}
- Expected Outcome: ${ws.expectedOutcome || 'Operational Efficiency'}`);

  // Section 2: DISCOVERY HISTORY (Already Answered by User)
  const userConfirmedFacts = (discovery.userConfirmedFacts || []).map((f, idx) => `  ${idx + 1}. [${f.source}] "${f.fact}"`).join('\n');
  const userStatements = discovery.userStatements && discovery.userStatements.length > 0
    ? discovery.userStatements.map((stmt, idx) => `  ${idx + 1}. "${stmt}"`).join('\n')
    : '  No previous user statements recorded.';

  sections.push(`=== SECTION 2: DISCOVERY CONVERSATION HISTORY (ALREADY GATHERED) ===
- User Confirmed Facts:
${userConfirmedFacts || '  None recorded yet.'}
- Recent User Statements:
${userStatements}`);

  // Section 3: UPLOADED DOCUMENT CONTEXT (Known Documented Evidence)
  let docSection = `=== SECTION 3: UPLOADED DOCUMENT CONTEXT (EVIDENCE ALREADY INDEXED) ===\n`;
  if (docContext.analyzedCount > 0 && docContext.combinedText) {
    docSection += `- Analyzed Documents (${docContext.analyzedCount}): ${(docContext.sourceReferences || []).map(d => `${d.filename} (${d.purpose || 'Document'})`).join(', ')}\n`;
    const boundedText = docContext.combinedText.slice(0, 14000);
    docSection += `- Extracted Document Text:\n"""\n${boundedText}\n"""`;
  } else {
    docSection += 'No uploaded business documents are available for this workspace.';
  }
  sections.push(docSection);

  // Section 4: REQUIRED OUTPUT FORMAT
  sections.push(`=== SECTION 4: REQUIRED JSON OUTPUT SCHEMA ===
Generate a valid JSON object with an array of 5 to 7 prioritized discovery questions strictly matching this schema:
{
  "questions": [
    {
      "category": "Problem Definition | Process Intelligence | Stakeholders | Technical Constraints | Systems of Record | Integration Architecture | Business Metrics",
      "question": "Clear, grounded inquiry addressing an unconfirmed detail or unknown requirement (min 10 chars)",
      "rationale": "Clear 1-sentence explanation of why answering this informs architecture or workflow design",
      "status": "UNANSWERED",
      "whyItMatters": "Strategic business impact of knowing this detail",
      "sourceContext": "Reference to the document or gap that prompted this question",
      "expectedAnswerType": "free-text | choice | volume-metric | system-name | policy-rule",
      "isBlocking": false
    }
  ]
}`);

  return {
    systemPrompt,
    userPrompt: sections.join('\n\n'),
    promptVersion: PROMPT_VERSION
  };
}
