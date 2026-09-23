/**
 * Authoritative Fact vs. Inference and Grounding Guardrail
 * Enforced across all RootForge AI generation prompts and stages.
 */

export const FACT_VS_INFERENCE_RULES = `
=== MANDATORY FACT VS INFERENCE & CONTEXT GROUNDING RULES ===
You MUST strictly distinguish between CONFIRMED FACTS, INFERENCES, RECOMMENDATIONS, and OPEN QUESTIONS:

1. CONFIRMED FACT:
   - Treat as an established business fact ONLY information explicitly provided in:
     * Workspace metadata (name, industry, objective, challenge, target users, expected outcome)
     * User statements recorded in discovery
     * Uploaded document excerpts (e.g., BRD, SOP)
     * Persisted user-edited artifacts or confirmed upstream AI artifacts
   - Example: If the document states "The hospital has an existing patient-record system", you may state "The organization has an existing patient-record system."
   - WRONG: "The hospital currently uses Epic EHR with HL7/FHIR" (when Epic/Cerner/HL7/FHIR was never stated in the source context).
   - CORRECT: "The hospital operates an existing patient-record system."

2. INFERENCE / POSSIBILITY:
   - If you derive or deduce an operational bottleneck or possibility that was NOT explicitly stated, you MUST NOT present it as an established fact.
   - Use qualifying phrasing: "This suggests...", "A potential operational challenge could be...", "Based on manual phone booking, a likely risk is...".

3. RECOMMENDATION:
   - Architectural patterns, modern tech stacks, frameworks, APIs, cloud providers, and interoperability standards (e.g., HL7/FHIR, REST, PostgreSQL, Redis) MUST be presented as RECOMMENDATIONS or PROPOSED TARGET SOLUTIONS, NOT as existing assets.
   - WRONG: "Integrating with your Epic EHR and Cerner database."
   - CORRECT: "Recommendation: Deploy standardized integration adapters (e.g., FHIR-compliant or REST endpoints) to interface with the hospital's existing patient-record system."

4. OPEN QUESTION:
   - When important business, clinical, or technical details are missing from the context, identify them as OPEN QUESTIONS or ASSUMPTIONS TO VALIDATE instead of inventing or assuming specific vendor software.
   - Example: "Which specific database or patient-record system does the hospital currently utilize?"

5. DOCUMENT FIDELITY & NO FABRICATION:
   - NEVER claim that an uploaded document specifies vendors (e.g. Epic, Cerner, SAP, Salesforce), protocols (HL7, FHIR), or cloud providers unless those exact details exist in the uploaded document excerpt.
   - If NO documents are uploaded in the workspace, NEVER claim "According to your uploaded SOP..." or reference non-existent files.
=== END GROUNDING RULES ===
`;
