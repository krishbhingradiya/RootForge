/**
 * Solution JSON Schema & Rules for AI Generation
 * Aligns strictly with the Prisma Solution model, downstream Architecture/Planning stages,
 * and the frontend SolutionBuilderPage.
 */

export const solutionSchema = {
  name: 'Solution',
  version: '1.0',
  rules: {
    name: {
      type: 'string',
      required: true,
      minLength: 5
    },
    summary: {
      type: 'string',
      required: true,
      minLength: 20
    },
    businessValue: {
      type: 'string',
      required: true,
      minLength: 20
    },
    keyCapabilities: {
      type: 'array',
      required: true,
      minItems: 4,
      itemType: 'string'
    },
    automationOpps: {
      type: 'array',
      required: true,
      minItems: 3,
      itemType: 'string'
    },
    aiOpps: {
      type: 'array',
      required: true,
      minItems: 3,
      itemType: 'string'
    },
    techStack: {
      type: 'object',
      required: true,
      validator: (stack) => {
        return (
          stack &&
          typeof stack === 'object' &&
          typeof stack.frontend === 'string' && stack.frontend.trim().length > 0 &&
          typeof stack.backend === 'string' && stack.backend.trim().length > 0 &&
          typeof stack.database === 'string' && stack.database.trim().length > 0 &&
          typeof stack.ai_services === 'string' && stack.ai_services.trim().length > 0 &&
          typeof stack.integrations === 'string' && stack.integrations.trim().length > 0
        );
      },
      description: 'Object with frontend, backend, database, ai_services, and integrations strings'
    },
    implementationApproach: {
      type: 'string',
      required: true,
      minLength: 20
    },
    risks: {
      type: 'array',
      required: true,
      minItems: 3,
      itemValidator: (item) => {
        return (
          item &&
          typeof item === 'object' &&
          typeof item.risk === 'string' && item.risk.trim().length > 0 &&
          typeof item.mitigation === 'string' && item.mitigation.trim().length > 0
        );
      },
      itemDescription: 'Object with non-empty "risk" and "mitigation" strings'
    },
    assumptions: {
      type: 'array',
      required: true,
      minItems: 3,
      itemType: 'string'
    },
    dependencies: {
      type: 'array',
      required: true,
      minItems: 3,
      itemType: 'string'
    },
    options: {
      type: 'array',
      required: true,
      exactItems: 3,
      validator: (options) => {
        if (!Array.isArray(options) || options.length !== 3) {
          return { valid: false, error: 'Must contain exactly 3 comparison options' };
        }

        const requiredIds = ['OPTION_A', 'OPTION_B', 'OPTION_C'];
        const foundIds = options.map(opt => opt?.id);

        for (const reqId of requiredIds) {
          if (!foundIds.includes(reqId)) {
            return { valid: false, error: `Missing required option with id: "${reqId}"` };
          }
        }

        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          if (!opt || typeof opt !== 'object') {
            return { valid: false, error: `Option at index ${i} is not a valid object` };
          }

          if (typeof opt.name !== 'string' || !opt.name.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "name"` };
          }
          if (typeof opt.tagline !== 'string' || !opt.tagline.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "tagline"` };
          }
          if (typeof opt.complexity !== 'string' || !opt.complexity.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "complexity"` };
          }
          if (typeof opt.estimatedEffort !== 'string' || !opt.estimatedEffort.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "estimatedEffort"` };
          }
          if (typeof opt.estimatedCost !== 'string' || !opt.estimatedCost.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "estimatedCost"` };
          }
          if (typeof opt.businessImpact !== 'string' || !opt.businessImpact.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "businessImpact"` };
          }
          if (typeof opt.automationPotential !== 'string' || !opt.automationPotential.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "automationPotential"` };
          }
          if (typeof opt.implementationRisk !== 'string' || !opt.implementationRisk.trim()) {
            return { valid: false, error: `Option ${opt.id || i} missing non-empty "implementationRisk"` };
          }
          if (!Array.isArray(opt.pros) || opt.pros.length < 2) {
            return { valid: false, error: `Option ${opt.id || i} "pros" must contain at least 2 items` };
          }
          if (!Array.isArray(opt.cons) || opt.cons.length < 2) {
            return { valid: false, error: `Option ${opt.id || i} "cons" must contain at least 2 items` };
          }
        }

        return { valid: true };
      }
    },
    selectedOption: {
      type: 'string',
      required: true,
      allowedValues: ['OPTION_A', 'OPTION_B', 'OPTION_C']
    }
  }
};
