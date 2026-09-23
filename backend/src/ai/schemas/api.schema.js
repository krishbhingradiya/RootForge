/**
 * API Blueprint Schema Definition & Database Alignment Validator
 * Compatible with Prisma ApiDesign model and Frontend API specifications
 */

export const apiSchema = {
  name: 'ApiDesign',
  properties: {
    title: {
      type: 'string',
      required: true,
      minLength: 5
    },
    baseUrl: {
      type: 'string',
      required: true,
      validator: (url) => {
        if (!url || typeof url !== 'string' || !url.startsWith('/')) {
          return { valid: false, error: 'baseUrl must be a valid path starting with "/" (e.g. "/api/v1")' };
        }
        return { valid: true };
      }
    },
    authType: {
      type: 'string',
      required: true,
      minLength: 3
    },
    endpoints: {
      type: 'array',
      required: true,
      minItems: 4,
      validator: (endpoints) => {
        if (!Array.isArray(endpoints) || endpoints.length < 4) {
          return { valid: false, error: 'Must contain at least 4 REST API endpoints' };
        }

        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

        for (let i = 0; i < endpoints.length; i++) {
          const ep = endpoints[i];
          if (!ep || typeof ep !== 'object') {
            return { valid: false, error: `Endpoint at index ${i} is not a valid object` };
          }

          const method = (ep.method || '').toUpperCase();
          if (!validMethods.includes(method)) {
            return {
              valid: false,
              error: `Endpoint at index ${i} has invalid method "${ep.method}". Must be one of: ${validMethods.join(', ')}`
            };
          }

          if (typeof ep.endpoint !== 'string' || !ep.endpoint.startsWith('/')) {
            return {
              valid: false,
              error: `Endpoint at index ${i} invalid path "${ep.endpoint}". Must start with "/"`
            };
          }

          if (typeof ep.description !== 'string' || ep.description.trim().length < 15) {
            return {
              valid: false,
              error: `Endpoint [${method} ${ep.endpoint}] description must be at least 15 characters`
            };
          }

          if (typeof ep.parameters !== 'string') {
            return {
              valid: false,
              error: `Endpoint [${method} ${ep.endpoint}] missing "parameters" string`
            };
          }

          if (typeof ep.requestBody !== 'string') {
            return {
              valid: false,
              error: `Endpoint [${method} ${ep.endpoint}] missing "requestBody" string`
            };
          }

          if (typeof ep.responseBody !== 'string') {
            return {
              valid: false,
              error: `Endpoint [${method} ${ep.endpoint}] missing "responseBody" string`
            };
          }

          if (typeof ep.authentication !== 'string' || !ep.authentication.trim()) {
            return {
              valid: false,
              error: `Endpoint [${method} ${ep.endpoint}] missing "authentication" specification`
            };
          }
        }

        return { valid: true };
      }
    }
  }
};

/**
 * Validates that API resource nouns correspond to declared database entities.
 * 
 * @param {Array<object>} endpoints List of API endpoints
 * @param {Array<object>} entities List of database entities
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
export function validateApiDatabaseConsistency(endpoints, entities) {
  const errors = [];
  if (!Array.isArray(endpoints) || !Array.isArray(entities) || entities.length === 0) {
    return { valid: true, errors: [] };
  }

  // Normalize entity names to lowercase singular and plural forms
  const validEntityRoots = new Set();
  for (const ent of entities) {
    if (ent && ent.name) {
      const lower = ent.name.toLowerCase();
      validEntityRoots.add(lower);
      // common pluralizations
      validEntityRoots.add(`${lower}s`);
      validEntityRoots.add(`${lower}es`);
      if (lower.endsWith('y')) {
        validEntityRoots.add(`${lower.slice(0, -1)}ies`);
      }
    }
  }

  // Allow standard utility paths: health, auth, metrics, search, webhooks, export
  const standardUtils = new Set(['health', 'auth', 'login', 'token', 'metrics', 'search', 'webhooks', 'export', 'users', 'user']);
  const matchedEntities = new Set();

  for (const ep of endpoints) {
    if (!ep || !ep.endpoint) continue;
    // Extract first substantive segment after /api/v1 or /
    const segments = ep.endpoint.split('/').filter(s => s && s !== 'api' && s !== 'v1' && !s.startsWith(':'));
    if (segments.length > 0) {
      const resourceNoun = segments[0].toLowerCase();
      const isKnownEntity = validEntityRoots.has(resourceNoun);
      const isUtil = standardUtils.has(resourceNoun);

      if (isKnownEntity) {
        // Find original entity name
        for (const ent of entities) {
          if (ent?.name && ent.name.toLowerCase() === resourceNoun.replace(/s$|es$|ies$/, '')) {
            matchedEntities.add(ent.name);
          } else if (ent?.name && resourceNoun.startsWith(ent.name.toLowerCase())) {
            matchedEntities.add(ent.name);
          }
        }
      } else if (!isUtil) {
        errors.push(`API resource "/${resourceNoun}" in "${ep.endpoint}" does not correspond to any declared Database entity`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    matchingEntities: Array.from(matchedEntities)
  };
}
