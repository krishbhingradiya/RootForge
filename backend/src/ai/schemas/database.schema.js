/**
 * Database Schema Definition & ERD Relational Integrity Validator
 * Compatible with Prisma DatabaseDesign model and Frontend Database Designer
 */

export const databaseSchema = {
  name: 'DatabaseDesign',
  properties: {
    title: {
      type: 'string',
      required: true,
      minLength: 5
    },
    entities: {
      type: 'array',
      required: true,
      minItems: 3,
      validator: (entities) => {
        if (!Array.isArray(entities) || entities.length < 3) {
          return { valid: false, error: 'Must contain at least 3 relational database entities' };
        }

        const seenEntityNames = new Set();

        for (let i = 0; i < entities.length; i++) {
          const ent = entities[i];
          if (!ent || typeof ent !== 'object') {
            return { valid: false, error: `Entity at index ${i} is not a valid object` };
          }

          if (typeof ent.name !== 'string' || !ent.name.trim()) {
            return { valid: false, error: `Entity at index ${i} missing valid string "name"` };
          }

          const trimmedName = ent.name.trim();
          if (seenEntityNames.has(trimmedName.toLowerCase())) {
            return { valid: false, error: `Duplicate entity name detected: "${trimmedName}"` };
          }
          seenEntityNames.add(trimmedName.toLowerCase());

          if (typeof ent.description !== 'string' || ent.description.trim().length < 10) {
            return { valid: false, error: `Entity "${trimmedName}" description must be at least 10 characters` };
          }

          if (!Array.isArray(ent.fields) || ent.fields.length < 3) {
            return { valid: false, error: `Entity "${trimmedName}" must define at least 3 fields` };
          }

          let hasPrimaryKey = false;
          const seenFieldNames = new Set();

          for (let j = 0; j < ent.fields.length; j++) {
            const f = ent.fields[j];
            if (!f || typeof f !== 'object') {
              return { valid: false, error: `Entity "${trimmedName}" field at index ${j} is invalid` };
            }

            if (typeof f.name !== 'string' || !f.name.trim()) {
              return { valid: false, error: `Entity "${trimmedName}" field at index ${j} missing "name"` };
            }

            const fieldName = f.name.trim();
            if (seenFieldNames.has(fieldName.toLowerCase())) {
              return { valid: false, error: `Entity "${trimmedName}" contains duplicate field "${fieldName}"` };
            }
            seenFieldNames.add(fieldName.toLowerCase());

            if (typeof f.type !== 'string' || !f.type.trim()) {
              return { valid: false, error: `Entity "${trimmedName}" field "${fieldName}" missing data "type"` };
            }

            const constraints = typeof f.constraints === 'string' ? f.constraints.toUpperCase() : '';
            if (constraints.includes('PRIMARY KEY') || fieldName.toLowerCase() === 'id') {
              hasPrimaryKey = true;
            }
          }

          if (!hasPrimaryKey) {
            return { valid: false, error: `Entity "${trimmedName}" must designate a PRIMARY KEY field (e.g. "id")` };
          }
        }

        return { valid: true };
      }
    },
    relations: {
      type: 'array',
      required: true,
      minItems: 2,
      validator: (relations, fullData) => {
        if (!Array.isArray(relations) || relations.length < 2) {
          return { valid: false, error: 'Must contain at least 2 entity relationships' };
        }

        // Build lookup map of entities and their fields for relational integrity checking
        const entityMap = new Map();
        if (fullData && Array.isArray(fullData.entities)) {
          for (const ent of fullData.entities) {
            if (ent && ent.name && Array.isArray(ent.fields)) {
              const fieldSet = new Set(ent.fields.map(f => (f.name || '').toLowerCase()));
              entityMap.set(ent.name.toLowerCase(), fieldSet);
            }
          }
        }

        for (let i = 0; i < relations.length; i++) {
          const rel = relations[i];
          if (!rel || typeof rel !== 'object') {
            return { valid: false, error: `Relationship at index ${i} is not an object` };
          }

          if (typeof rel.from !== 'string' || !rel.from.includes('.')) {
            return { valid: false, error: `Relationship at index ${i} invalid "from" reference. Must be "Entity.field"` };
          }

          if (typeof rel.to !== 'string' || !rel.to.includes('.')) {
            return { valid: false, error: `Relationship at index ${i} invalid "to" reference. Must be "Entity.field"` };
          }

          // Check Relational Integrity (No Dangling Entities or Fields)
          const [fromEnt, fromField] = rel.from.split('.');
          const [toEnt, toField] = rel.to.split('.');

          const fromFields = entityMap.get(fromEnt.trim().toLowerCase());
          if (!fromFields) {
            return {
              valid: false,
              error: `Dangling relationship: Source entity "${fromEnt}" does not exist in declared entities`
            };
          }
          if (!fromFields.has(fromField.trim().toLowerCase())) {
            return {
              valid: false,
              error: `Dangling relationship: Source field "${fromField}" does not exist in entity "${fromEnt}"`
            };
          }

          const toFields = entityMap.get(toEnt.trim().toLowerCase());
          if (!toFields) {
            return {
              valid: false,
              error: `Dangling relationship: Target entity "${toEnt}" does not exist in declared entities`
            };
          }
          if (!toFields.has(toField.trim().toLowerCase())) {
            return {
              valid: false,
              error: `Dangling relationship: Target field "${toField}" does not exist in entity "${toEnt}"`
            };
          }
        }

        return { valid: true };
      }
    },
    sqlSchema: {
      type: 'string',
      required: true,
      minLength: 50,
      validator: (sql) => {
        if (!sql.toUpperCase().includes('CREATE TABLE')) {
          return { valid: false, error: 'sqlSchema must contain valid SQL DDL statements ("CREATE TABLE")' };
        }
        return { valid: true };
      }
    },
    prismaSchema: {
      type: 'string',
      required: true,
      minLength: 30,
      validator: (prisma) => {
        if (!prisma.includes('model ')) {
          return { valid: false, error: 'prismaSchema must contain valid Prisma schema syntax ("model")' };
        }
        return { valid: true };
      }
    }
  }
};
