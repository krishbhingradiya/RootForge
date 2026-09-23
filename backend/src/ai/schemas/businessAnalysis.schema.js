/**
 * Business Analysis JSON Schema & Rules for AI Generation
 * Aligns strictly with the Prisma BusinessAnalysis model, canonical evidence provenance,
 * and downstream Solution Builder requirements.
 */

export const businessAnalysisSchema = {
  name: 'BusinessAnalysis',
  version: '2.0',
  rules: {
    currentState: {
      type: 'string',
      required: true,
      minLength: 20
    },
    futureState: {
      type: 'string',
      required: true,
      minLength: 20
    },
    goals: {
      type: 'array',
      required: true,
      minItems: 3,
      itemValidator: (item) => {
        if (typeof item === 'string') return item.trim().length > 0;
        return (
          item &&
          typeof item === 'object' &&
          (typeof item.goal === 'string' || typeof item.title === 'string' || typeof item.text === 'string')
        );
      },
      itemDescription: 'Non-empty string or structured goal object with goal/title'
    },
    painPoints: {
      type: 'array',
      required: true,
      minItems: 3,
      itemValidator: (item) => {
        if (typeof item === 'string') return item.trim().length > 0;
        return (
          item &&
          typeof item === 'object' &&
          (typeof item.title === 'string' || typeof item.description === 'string' || typeof item.text === 'string')
        );
      },
      itemDescription: 'Non-empty string or structured pain point object with title/description'
    },
    stakeholders: {
      type: 'array',
      required: true,
      minItems: 3,
      itemValidator: (item) => {
        return (
          item &&
          typeof item === 'object' &&
          typeof item.role === 'string' &&
          item.role.trim().length > 0 &&
          typeof item.interest === 'string' &&
          item.interest.trim().length > 0
        );
      },
      itemDescription: 'Object with non-empty "role" and "interest" strings'
    },
    requirements: {
      type: 'array',
      required: true,
      minItems: 4,
      itemValidator: (item) => {
        return (
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          item.id.trim().length > 0 &&
          (typeof item.type === 'string' || typeof item.classification === 'string') &&
          (typeof item.text === 'string' || typeof item.title === 'string' || typeof item.description === 'string')
        );
      },
      itemDescription: 'Object with non-empty "id", "type" (or classification), and "text" (or title/description)'
    },
    gaps: {
      type: 'array',
      required: false,
      minItems: 0,
      itemType: 'string'
    },
    processIssues: {
      type: 'array',
      required: false,
      minItems: 0,
      itemType: 'string'
    },
    automationOpportunities: {
      type: 'array',
      required: true,
      minItems: 2,
      itemValidator: (item) => {
        return (
          item &&
          typeof item === 'object' &&
          (typeof item.title === 'string' || typeof item.opportunity === 'string') &&
          (item.title || item.opportunity).trim().length > 0
        );
      },
      itemDescription: 'Object with non-empty "title" or "opportunity"'
    },
    digitalMaturityScore: {
      type: 'integer',
      required: true,
      min: 1,
      max: 100
    }
  }
};
