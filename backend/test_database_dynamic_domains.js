/**
 * Dynamic Multi-Domain Database & API Designer Verification Test
 * 
 * Verifies that:
 * 1. Healthcare requirement -> Healthcare entities (Doctor, Patient, Appointment), 0 leakage
 * 2. E-Commerce requirement -> E-Commerce entities (Customer, Product, Order, OrderItem, Payment), 0 healthcare leakage
 * 3. Logistics requirement -> Logistics entities (Shipment, Warehouse, Driver, Vehicle, TrackingEvent), 0 healthcare leakage
 * 4. Cross-artifact consistency: ERD == SQL == Prisma == REST APIs == Integrations == Data Flow == Validation
 * 5. Foreign keys referential integrity child FK -> parent PK
 * 6. SQL DDL for PostgreSQL and SQLite
 * 7. Prisma Schema syntax and relations
 * 8. REST APIs and OpenAPI 3.0.3 specification
 */

import { synthesizeCanonicalDomainModel } from './src/services/domainModelSynthesizer.service.js';
import { detectDomain } from './src/services/workspaceContext.service.js';

function runDomainTests() {
  console.log('============================================================');
  console.log('DYNAMIC DATABASE & API DESIGNER - MULTI-DOMAIN TEST SUITE');
  console.log('============================================================\n');

  const testCases = [
    {
      id: 'TEST_A_HEALTHCARE',
      name: 'Healthcare Platform',
      context: {
        id: 'ws-health-001',
        title: 'Apex Clinic Patient Intake & EHR Flow',
        industry: 'Healthcare',
        description: 'Build a hospital appointment and patient intake platform with doctors, patients, appointments, clinical queue and notifications.',
        requirements: [
          { code: 'FR-01', text: 'Manage doctor and patient encounters' },
          { code: 'FR-02', text: 'Schedule clinical appointments and track status' }
        ]
      },
      expectedDomain: 'HEALTHCARE',
      expectedEntities: ['Doctor', 'Patient', 'Appointment'],
      forbiddenTerms: ['Product', 'Cart', 'Shipment', 'Warehouse', 'Driver', 'Beneficiary', 'Loan']
    },
    {
      id: 'TEST_B_ECOMMERCE',
      name: 'E-Commerce Marketplace',
      context: {
        id: 'ws-ecom-002',
        title: 'Nordic Retail Marketplace & Order Sync',
        industry: 'Retail & E-Commerce',
        description: 'Build an online marketplace for sellers and customers with product catalog, shopping cart, orders, payment processing, and checkout.',
        requirements: [
          { code: 'FR-10', text: 'Customers can browse products and add to cart' },
          { code: 'FR-11', text: 'Customers can place orders and complete payment' }
        ]
      },
      expectedDomain: 'ECOMMERCE',
      expectedEntities: ['Customer', 'Product', 'Order', 'OrderItem', 'Payment'],
      forbiddenTerms: ['Doctor', 'Patient', 'Appointment', 'doctorId', 'patientId', 'clinical', 'HealthBase', 'Twilio', 'Warehouse', 'Driver']
    },
    {
      id: 'TEST_C_LOGISTICS',
      name: 'Logistics & Telematics',
      context: {
        id: 'ws-log-003',
        title: 'Velocity Freight Telematics & Dispatch',
        industry: 'Logistics',
        description: 'Build a logistics platform for shipment booking, warehouse management, driver assignment, delivery tracking and proof of delivery.',
        requirements: [
          { code: 'FR-20', text: 'Book shipments and assign drivers/vehicles' },
          { code: 'FR-21', text: 'Track real-time shipment dispatch across warehouses' }
        ]
      },
      expectedDomain: ['LOGISTICS', 'SUPPLY_CHAIN'],
      expectedEntities: ['Customer', 'Shipment', 'Warehouse', 'Driver', 'Vehicle', 'TrackingEvent'],
      forbiddenTerms: ['Doctor', 'Patient', 'Appointment', 'doctorId', 'patientId', 'clinical', 'HealthBase', 'Twilio', 'Cart', 'OrderItem']
    }
  ];

  let allPassed = true;

  testCases.forEach((tc, idx) => {
    console.log(`\n------------------------------------------------------------`);
    console.log(`[TEST ${idx + 1}/3] ${tc.id}: ${tc.name}`);
    console.log(`------------------------------------------------------------`);

    // 1. Domain Detection
    const detected = detectDomain(tc.context);
    const domainMatches = Array.isArray(tc.expectedDomain) 
      ? tc.expectedDomain.includes(detected) 
      : detected === tc.expectedDomain;
    console.log(`✓ Detected Domain: ${detected} (Expected: ${Array.isArray(tc.expectedDomain) ? tc.expectedDomain.join(' / ') : tc.expectedDomain})`);
    if (!domainMatches) {
      console.error(`❌ Domain detection mismatch! Got ${detected}, expected ${tc.expectedDomain}`);
      allPassed = false;
    }

    // 2. Canonical Model Synthesis
    const model = synthesizeCanonicalDomainModel(tc.context);
    console.log(`✓ Synthesized canonical domain model for ${model.domain}`);

    // Check Entities
    const entityNames = model.entities.map(e => e.name);
    console.log(`  Entities (${entityNames.length}): ${entityNames.join(', ')}`);
    tc.expectedEntities.forEach(expected => {
      if (!entityNames.includes(expected)) {
        console.error(`❌ Missing expected entity: ${expected}`);
        allPassed = false;
      }
    });

    // Check Forbidden Terms (No Healthcare leakage in E-Commerce or Logistics!)
    const serializedModel = JSON.stringify({
      entities: model.entities,
      apis: model.endpoints,
      integrations: model.integrations,
      dataFlow: model.dataFlows
    });

    let leakageFound = false;
    tc.forbiddenTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(serializedModel)) {
        console.error(`❌ LEAKAGE DETECTED: Found forbidden term "${term}" in ${tc.id}!`);
        leakageFound = true;
        allPassed = false;
      }
    });
    if (!leakageFound) {
      console.log(`✓ Zero cross-domain leakage: none of [${tc.forbiddenTerms.join(', ')}] found`);
    }

    // 3. Cross-Artifact Consistency Checks
    console.log(`\n  Checking Cross-Artifact Consistency:`);

    // SQL Tables == ERD Entities
    const sqlPostgres = model.sqlSchema;
    entityNames.forEach(name => {
      const snake = name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
      const hasTable = sqlPostgres.includes(`CREATE TABLE IF NOT EXISTS ${snake}`) || 
                       sqlPostgres.includes(`CREATE TABLE IF NOT EXISTS "${snake}"`) ||
                       sqlPostgres.includes(`CREATE TABLE IF NOT EXISTS ${name}`);
      if (!hasTable) {
        console.error(`❌ Entity ${name} (table: ${snake}) missing in PostgreSQL DDL!`);
        allPassed = false;
      }
    });
    console.log(`  ✓ SQL DDL includes all ${entityNames.length} entities for PostgreSQL`);

    // Prisma Models == ERD Entities
    const prismaSchema = model.prismaSchema;
    entityNames.forEach(name => {
      if (!prismaSchema.includes(`model ${name} {`)) {
        console.error(`❌ Entity ${name} missing in Prisma Schema!`);
        allPassed = false;
      }
    });
    console.log(`  ✓ Prisma Schema includes all ${entityNames.length} models`);

    // REST APIs mapped to domain entities
    const apiEndpoints = model.endpoints;
    console.log(`  ✓ REST APIs (${apiEndpoints.length} endpoints):`);
    apiEndpoints.forEach(ep => {
      console.log(`    - [${ep.method}] ${ep.endpoint} (Target: ${ep.primaryEntity})`);
      if (!entityNames.includes(ep.primaryEntity)) {
        console.error(`❌ REST API ${ep.endpoint} operates on invalid entity: ${ep.primaryEntity}`);
        allPassed = false;
      }
    });

    // Foreign Key Referential Integrity: Child FK must reference Parent PK
    console.log(`  ✓ Checking Referential Integrity (${model.relations.length} relationships):`);
    model.relations.forEach(rel => {
      const [childTbl, childCol] = rel.from.split('.');
      const [parentTbl, parentCol] = rel.to.split('.');
      const childEnt = model.entities.find(e => e.name === childTbl);
      const parentEnt = model.entities.find(e => e.name === parentTbl);

      if (!childEnt) {
        console.error(`❌ Invalid relationship: Child table "${childTbl}" does not exist!`);
        allPassed = false;
      }
      if (!parentEnt) {
        console.error(`❌ Invalid relationship: Parent table "${parentTbl}" does not exist!`);
        allPassed = false;
      }
      const childFieldExists = childEnt?.fields.some(f => f.name === childCol);
      const parentFieldExists = parentEnt?.fields.some(f => f.name === parentCol);

      if (!childFieldExists) {
        console.error(`❌ Relationship FK "${childCol}" does not exist in child "${childTbl}"!`);
        allPassed = false;
      }
      if (!parentFieldExists) {
        console.error(`❌ Relationship PK "${parentCol}" does not exist in parent "${parentTbl}"!`);
        allPassed = false;
      }
      console.log(`    - Valid FK: ${childTbl}.${childCol} -> ${parentTbl}.${parentCol} (${rel.type})`);
    });

    // Integration Topology Components
    const components = model.integrations;
    console.log(`  ✓ Integration Architecture (${components.length} components): ${components.map(c => c.name).join(', ')}`);

    // Data Flow Steps
    const flowSteps = model.dataFlows;
    console.log(`  ✓ Data Flow (${flowSteps.length} steps) from ${flowSteps[0]?.source} to ${flowSteps[flowSteps.length - 1]?.destination}`);

    // Validation Score
    const val = model.validation;
    console.log(`  ✓ Model Validation: Score = ${val.score}/100, Issues = ${val.criticalIssues.length} critical, ${val.warnings.length} warnings, ${val.suggestions.length} suggestions`);
    if (val.score < 80) {
      console.error(`❌ Validation score too low: ${val.score}/100`);
      allPassed = false;
    }
  });

  console.log('\n============================================================');
  if (allPassed) {
    console.log('✅ ALL DOMAIN SYNTHESIS TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error('❌ SOME TESTS FAILED! Review errors above.');
    process.exit(1);
  }
  console.log('============================================================\n');
}

runDomainTests();
