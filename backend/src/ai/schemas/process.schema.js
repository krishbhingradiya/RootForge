/**
 * Process JSON Schema & Workflow Rules
 * Aligns strictly with the Prisma ProcessModel and ProcessNode models,
 * and the BPMN / Swimlane / Decision Tree Process Intelligence UI.
 */

export const processSchema = {
  name: 'ProcessModel',
  version: '1.0',
  rules: {
    title: {
      type: 'string',
      required: true,
      minLength: 5
    },
    description: {
      type: 'string',
      required: true,
      minLength: 20
    },
    type: {
      type: 'string',
      required: true,
      allowedValues: ['WORKFLOW', 'SWIMLANE', 'DECISION_TREE']
    },
    nodes: {
      type: 'array',
      required: true,
      minItems: 5,
      validator: (nodes) => {
        if (!Array.isArray(nodes) || nodes.length < 5) {
          return { valid: false, error: 'Must contain at least 5 process workflow nodes' };
        }

        const validTypes = [
          'START', 'ACTION', 'AUTOMATION', 'SUB_PROCESS', 'DECISION_GATE',
          'HUMAN_APPROVAL', 'INTEGRATION', 'NOTIFICATION', 'END_STATE',
          'STEP', 'PROCESS', 'DECISION', 'APPROVAL', 'AI', 'RULE',
          'DATA', 'HUMAN_REVIEW', 'EXCEPTION', 'END'
        ];

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (!n || typeof n !== 'object') {
            return { valid: false, error: `Process step at index ${i} is not a valid object` };
          }

          if (typeof n.stepOrder !== 'number' || !Number.isInteger(n.stepOrder) || n.stepOrder !== i + 1) {
            return { valid: false, error: `Process step at index ${i} must have sequential "stepOrder" equal to ${i + 1}, found ${n?.stepOrder}` };
          }

          if (typeof n.label !== 'string' || !n.label.trim()) {
            return { valid: false, error: `Process step at index ${i} missing non-empty "label"` };
          }

          const upperType = (n.type || '').toUpperCase();
          if (!validTypes.includes(upperType)) {
            return {
              valid: false,
              error: `Process step at index ${i} has invalid type "${n.type}". Must be one of: ${validTypes.join(', ')}`
            };
          }

          if (typeof n.actor !== 'string' || !n.actor.trim()) {
            return { valid: false, error: `Process step at index ${i} missing non-empty "actor"` };
          }

          if (typeof n.description !== 'string' || !n.description.trim()) {
            return { valid: false, error: `Process step at index ${i} missing non-empty "description"` };
          }
        }

        return { valid: true };
      }
    }
  }
};
