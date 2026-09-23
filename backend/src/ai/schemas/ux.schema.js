/**
 * UX Design Schema Definition
 * Compatible with Prisma UXDesign model and existing Frontend UX Studio
 */

export const uxSchema = {
  name: 'UXDesign',
  properties: {
    title: {
      type: 'string',
      required: true,
      minLength: 5
    },
    designTokens: {
      type: 'object',
      required: true,
      validator: (tokens) => {
        if (!tokens || typeof tokens !== 'object') {
          return { valid: false, error: 'designTokens must be a non-null object' };
        }
        if (!tokens.palette || typeof tokens.palette !== 'object') {
          return { valid: false, error: 'designTokens.palette must be an object' };
        }
        const requiredPalette = ['background', 'cardBg', 'textPrimary', 'accent'];
        for (const p of requiredPalette) {
          if (!tokens.palette[p] || typeof tokens.palette[p] !== 'string') {
            return { valid: false, error: `designTokens.palette missing string property "${p}"` };
          }
        }
        return { valid: true };
      }
    },
    screens: {
      type: 'array',
      required: true,
      minItems: 3,
      validator: (screens) => {
        if (!Array.isArray(screens) || screens.length < 3) {
          return { valid: false, error: 'Must contain at least 3 UI screens' };
        }

        const seenIds = new Set();
        for (let i = 0; i < screens.length; i++) {
          const s = screens[i];
          if (!s || typeof s !== 'object') {
            return { valid: false, error: `Screen at index ${i} is not a valid object` };
          }

          if (typeof s.id !== 'string' || !s.id.trim()) {
            return { valid: false, error: `Screen at index ${i} missing valid string "id"` };
          }

          const trimmedId = s.id.trim();
          if (seenIds.has(trimmedId)) {
            return { valid: false, error: `Duplicate screen ID detected: "${trimmedId}"` };
          }
          seenIds.add(trimmedId);

          if (typeof s.name !== 'string' || !s.name.trim()) {
            return { valid: false, error: `Screen "${trimmedId}" missing non-empty "name"` };
          }

          if (typeof s.description !== 'string' || s.description.trim().length < 15) {
            return { valid: false, error: `Screen "${trimmedId}" description must be at least 15 characters` };
          }

          if (typeof s.layout !== 'string' || s.layout.trim().length < 20) {
            return { valid: false, error: `Screen "${trimmedId}" layout must be at least 20 characters describing UI components and structure` };
          }
        }

        return { valid: true };
      }
    }
  }
};
