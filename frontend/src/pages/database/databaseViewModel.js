/**
 * Database & API Contract Studio — Single Source of Truth View Model
 * 
 * Provides dynamic, workspace-aware domain synthesis, reactive compilation,
 * bi-directional synchronization, DDL synthesis (PostgreSQL / SQLite),
 * Prisma ORM generation, OpenAPI 3.0.3 specification generation,
 * API-to-database traceability, multi-tier integration architecture,
 * data flow sequence modeling, and automated 14-rule schema validation.
 */

// Helper to convert PascalCase/camelCase to snake_case
export function toSnakeCase(str) {
  if (!str) return '';
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// Helper: Safe JSON parsing
export function safeParse(data, fallback = null) {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

/**
 * Domain Templates Dictionary for Dynamic Synthesis
 */
export const DOMAIN_BLUEPRINTS = {
  HEALTHCARE: {
    titleSuffix: 'Healthcare & Clinical Intake Data Model',
    entities: [
      {
        name: 'Doctor',
        description: 'Credentialed clinical practitioner and healthcare provider directory.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Unique physician UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Full legal provider name', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'specialization', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Medical specialty', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'licenseNumber', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'State medical license ID', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'departmentId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Department.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Department.id', isNullable: false, isUnique: false },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Record registration timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-01', 'FR-04']
      },
      {
        name: 'Patient',
        description: 'Registered patient encounter profiles and demographic identity.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Unique patient UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'externalId', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Master patient index / MRN', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Full patient name', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'dob', type: 'DATE', constraints: 'NOT NULL', description: 'Date of birth', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'phoneNumber', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'Primary contact phone', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Account intake timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-01', 'FR-02']
      },
      {
        name: 'Department',
        description: 'Clinical hospital wards, specialty departments, and clinic wings.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Department UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Department title', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'floorLocation', type: 'VARCHAR(50)', constraints: '', description: 'Building floor or wing', isPrimaryKey: false, isNullable: true, isUnique: false }
        ],
        sourceRequirements: ['FR-04']
      },
      {
        name: 'Appointment',
        description: 'Scheduled clinical consultations, slots, and triage bookings.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Unique consultation UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'patientId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'Foreign key referencing Patient.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Patient.id', isNullable: false, isUnique: false },
          { name: 'doctorId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'Foreign key referencing Doctor.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Doctor.id', isNullable: false, isUnique: false },
          { name: 'scheduledTime', type: 'TIMESTAMP', constraints: 'NOT NULL', description: 'Scheduled encounter appointment time', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'status', type: 'VARCHAR(30)', constraints: "DEFAULT 'SCHEDULED', NOT NULL", description: 'Booking lifecycle state', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "'SCHEDULED'" },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Creation audit timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-02', 'FR-03', 'FR-05']
      }
    ],
    relations: [
      { from: 'Doctor.departmentId', to: 'Department.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { from: 'Appointment.patientId', to: 'Patient.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { from: 'Appointment.doctorId', to: 'Doctor.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    endpoints: [
      {
        method: 'POST',
        endpoint: '/api/v1/appointments',
        name: 'Schedule Encounter',
        purpose: 'Create appointment reservation and verify physician slot availability.',
        description: 'Receives booking parameters, checks practitioner conflicts, and reserves the slot.',
        primaryEntity: 'Appointment',
        relatedEntities: ['Patient', 'Doctor'],
        fieldsUsed: ['patientId', 'doctorId', 'scheduledTime', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Patient, IntakeCoordinator, Staff',
        parameters: 'None (Request body payload)',
        requestBody: JSON.stringify({ patientId: 'pat_94982a1c', doctorId: 'doc_18820f4e', scheduledTime: '2026-10-15T09:30:00Z', notes: 'Routine intake' }, null, 2),
        responseBody: JSON.stringify({ id: 'apt_c08271fe', patientId: 'pat_94982a1c', doctorId: 'doc_18820f4e', scheduledTime: '2026-10-15T09:30:00Z', status: 'SCHEDULED' }, null, 2),
        statusCodes: [{ code: 201, description: 'Appointment created successfully.' }, { code: 400, description: 'Timeslot conflict.' }, { code: 401, description: 'Unauthorized JWT token.' }],
        errorResponse: JSON.stringify({ error: 'Conflict', message: 'Doctor already has a booked consultation in this time window.', code: 'ERR_TIMESLOT_CONFLICT' }, null, 2),
        sourceRequirements: ['FR-02', 'FR-05']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/appointments',
        name: 'List Appointments',
        purpose: 'Query and filter appointments by date, doctor, or status.',
        description: 'Paginated encounter listing with eager-loaded patient and physician metadata.',
        primaryEntity: 'Appointment',
        relatedEntities: ['Patient', 'Doctor'],
        fieldsUsed: ['id', 'patientId', 'doctorId', 'scheduledTime', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Staff, Practitioner',
        parameters: '?status=SCHEDULED&date=2026-10-15&page=1&limit=25',
        requestBody: 'None',
        responseBody: JSON.stringify({ data: [{ id: 'apt_c08271fe', status: 'SCHEDULED', patient: { name: 'Sarah Jenkins' }, doctor: { name: 'Dr. Marcus Vance' } }], total: 1 }, null, 2),
        statusCodes: [{ code: 200, description: 'Filtered appointments returned.' }, { code: 401, description: 'Unauthorized.' }],
        errorResponse: JSON.stringify({ error: 'Unauthorized', message: 'Token expired', code: 'ERR_AUTH_EXPIRED' }, null, 2),
        sourceRequirements: ['FR-03']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/patients/:id',
        name: 'Get Patient Profile',
        purpose: 'Fetch patient master demographic profile and encounter history.',
        description: 'Retrieves patient record by internal UUID or master patient index.',
        primaryEntity: 'Patient',
        relatedEntities: ['Appointment'],
        fieldsUsed: ['id', 'externalId', 'phoneNumber'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Staff, Clinician',
        parameters: ':id (UUID)',
        requestBody: 'None',
        responseBody: JSON.stringify({ id: 'pat_94982a1c', externalId: 'MRN-78491', name: 'Sarah Jenkins', phoneNumber: '+1-555-0192' }, null, 2),
        statusCodes: [{ code: 200, description: 'Patient located.' }, { code: 404, description: 'Patient not found.' }],
        errorResponse: JSON.stringify({ error: 'Not Found', message: 'Patient record pat_94982a1c does not exist.', code: 'ERR_PATIENT_NOT_FOUND' }, null, 2),
        sourceRequirements: ['FR-01']
      },
      {
        method: 'PATCH',
        endpoint: '/api/v1/appointments/:id/status',
        name: 'Update Encounter Status',
        purpose: 'Transition appointment state (CHECKED_IN, COMPLETED, CANCELLED).',
        description: 'Updates encounter status and logs transition audit record.',
        primaryEntity: 'Appointment',
        relatedEntities: [],
        fieldsUsed: ['id', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Staff, Practitioner',
        parameters: ':id (UUID)',
        requestBody: JSON.stringify({ status: 'CHECKED_IN', reason: 'Patient arrived at clinic front desk' }, null, 2),
        responseBody: JSON.stringify({ id: 'apt_c08271fe', status: 'CHECKED_IN', updatedAt: '2026-10-15T09:25:00Z' }, null, 2),
        statusCodes: [{ code: 200, description: 'Status transition completed.' }, { code: 400, description: 'Illegal state transition.' }],
        errorResponse: JSON.stringify({ error: 'Bad Request', message: 'Invalid status transition.', code: 'ERR_INVALID_TRANSITION' }, null, 2),
        sourceRequirements: ['FR-05']
      }
    ],
    primaryService: 'Clinical Orchestrator Service',
    externalProvider: 'SMS & Pager Notification Gateway',
    userActor: 'Patient / Intake Coordinator'
  },

  ECOMMERCE: {
    titleSuffix: 'E-Commerce Marketplace & Order Management Data Model',
    entities: [
      {
        name: 'Customer',
        description: 'Registered marketplace buyers, accounts, and contact profiles.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Customer UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Buyer account email', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Full customer name', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'phone', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'Contact phone number', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Account registration timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-01', 'FR-06']
      },
      {
        name: 'Product',
        description: 'Catalog items, merchandise, pricing, and active inventory status.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Product UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'sku', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Stock Keeping Unit', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Product title', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'price', type: 'DECIMAL(10,2)', constraints: 'NOT NULL', description: 'Unit selling price', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'stockQuantity', type: 'INTEGER', constraints: 'DEFAULT 0, NOT NULL', description: 'Available inventory units', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: '0' },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Catalog entry date', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-02']
      },
      {
        name: 'Order',
        description: 'Marketplace purchase transactions, order totals, and fulfillment status.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Order UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'orderNumber', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Order display reference (ORD-XXXXX)', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'customerId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Customer.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Customer.id', isNullable: false, isUnique: false },
          { name: 'totalAmount', type: 'DECIMAL(10,2)', constraints: 'NOT NULL', description: 'Total charge amount', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'status', type: 'VARCHAR(30)', constraints: "DEFAULT 'PENDING', NOT NULL", description: 'PENDING, PAID, SHIPPED, DELIVERED, CANCELLED', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "'PENDING'" },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Order submission timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-03', 'FR-04']
      },
      {
        name: 'OrderItem',
        description: 'Line item breakdown per order with quantity and unit price.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Line item UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Order.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Order.id', isNullable: false, isUnique: false },
          { name: 'productId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Product.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Product.id', isNullable: false, isUnique: false },
          { name: 'quantity', type: 'INTEGER', constraints: 'NOT NULL', description: 'Quantity purchased', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'unitPrice', type: 'DECIMAL(10,2)', constraints: 'NOT NULL', description: 'Price locked at purchase', isPrimaryKey: false, isNullable: false, isUnique: false }
        ],
        sourceRequirements: ['FR-03']
      },
      {
        name: 'Payment',
        description: 'Electronic payment transaction records, gateway capture tokens, and settlement.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Payment UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Order.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Order.id', isNullable: false, isUnique: false },
          { name: 'paymentMethod', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'CARD, UPI, PAYPAL, NETBANKING', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'transactionRef', type: 'VARCHAR(100)', constraints: 'UNIQUE, NOT NULL', description: 'Gateway charge ID', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'amount', type: 'DECIMAL(10,2)', constraints: 'NOT NULL', description: 'Amount charged', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'status', type: 'VARCHAR(30)', constraints: "DEFAULT 'SUCCESS', NOT NULL", description: 'SUCCESS, FAILED, REFUNDED', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "'SUCCESS'" },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Payment timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-04']
      }
    ],
    relations: [
      { from: 'Order.customerId', to: 'Customer.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { from: 'OrderItem.orderId', to: 'Order.id', type: 'Many-to-One', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { from: 'OrderItem.productId', to: 'Product.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { from: 'Payment.orderId', to: 'Order.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    endpoints: [
      {
        method: 'POST',
        endpoint: '/api/v1/orders',
        name: 'Create Order',
        purpose: 'Create and submit a customer order with items and initiate payment authorization.',
        description: 'Validates line items against product inventory, calculates order subtotal, and creates order records.',
        primaryEntity: 'Order',
        relatedEntities: ['Customer', 'OrderItem', 'Payment'],
        fieldsUsed: ['customerId', 'totalAmount', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Customer, Storefront',
        parameters: 'None (Request body payload)',
        requestBody: JSON.stringify({ customerId: 'cust_491028', items: [{ productId: 'prod_9021', quantity: 2 }], shippingAddress: '100 Market St, SF' }, null, 2),
        responseBody: JSON.stringify({ orderId: 'ord_772184', orderNumber: 'ORD-88192', totalAmount: 149.50, status: 'PENDING', paymentStatus: 'AUTHORIZED' }, null, 2),
        statusCodes: [{ code: 201, description: 'Order created successfully.' }, { code: 400, description: 'Insufficient stock or invalid line items.' }, { code: 401, description: 'Unauthorized JWT token.' }],
        errorResponse: JSON.stringify({ error: 'Conflict', message: 'Item SKU-88192 exceeds available inventory.', code: 'ERR_INSUFFICIENT_STOCK' }, null, 2),
        sourceRequirements: ['FR-03']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/products',
        name: 'List Products',
        purpose: 'Search and browse active catalog items with pagination and category filtering.',
        description: 'Returns list of published products with pricing and stock availability flags.',
        primaryEntity: 'Product',
        relatedEntities: [],
        fieldsUsed: ['id', 'sku', 'name', 'price', 'stockQuantity'],
        authentication: 'Optional Public',
        authorization: 'Public Storefront',
        parameters: '?category=electronics&query=wireless&page=1&limit=20',
        requestBody: 'None',
        responseBody: JSON.stringify({ data: [{ id: 'prod_9021', sku: 'SKU-88192', name: 'Wireless Headset Pro', price: 74.75, stockQuantity: 42 }], total: 1 }, null, 2),
        statusCodes: [{ code: 200, description: 'Catalog products returned.' }],
        errorResponse: JSON.stringify({ error: 'Bad Request', message: 'Invalid page parameter', code: 'ERR_PAGINATION' }, null, 2),
        sourceRequirements: ['FR-02']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/orders/:id',
        name: 'Get Order Details',
        purpose: 'Fetch order receipt, line item breakdown, and delivery tracking status.',
        description: 'Retrieves complete order record with eager-loaded line items and payment records.',
        primaryEntity: 'Order',
        relatedEntities: ['OrderItem', 'Payment'],
        fieldsUsed: ['id', 'orderNumber', 'customerId', 'totalAmount', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Customer, OrderAdmin',
        parameters: ':id (UUID)',
        requestBody: 'None',
        responseBody: JSON.stringify({ id: 'ord_772184', orderNumber: 'ORD-88192', totalAmount: 149.50, status: 'PAID', items: [{ productId: 'prod_9021', quantity: 2, unitPrice: 74.75 }] }, null, 2),
        statusCodes: [{ code: 200, description: 'Order located.' }, { code: 404, description: 'Order not found.' }],
        errorResponse: JSON.stringify({ error: 'Not Found', message: 'Order record not found', code: 'ERR_ORDER_NOT_FOUND' }, null, 2),
        sourceRequirements: ['FR-03']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/payments/process',
        name: 'Process Payment',
        purpose: 'Authorize and capture card or digital payment transaction against an order.',
        description: 'Calls external payment gateway (Stripe/Adyen), confirms receipt, and updates order status to PAID.',
        primaryEntity: 'Payment',
        relatedEntities: ['Order'],
        fieldsUsed: ['orderId', 'paymentMethod', 'transactionRef', 'amount', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Customer, PaymentService',
        parameters: 'None (Request body payload)',
        requestBody: JSON.stringify({ orderId: 'ord_772184', paymentMethod: 'CARD', gatewayToken: 'tok_visa_4242', amount: 149.50 }, null, 2),
        responseBody: JSON.stringify({ paymentId: 'pay_99182', orderId: 'ord_772184', status: 'SUCCESS', transactionRef: 'ch_3N829104' }, null, 2),
        statusCodes: [{ code: 201, description: 'Payment settled successfully.' }, { code: 402, description: 'Payment failed or card declined.' }],
        errorResponse: JSON.stringify({ error: 'Payment Failed', message: 'Card declined by issuing bank.', code: 'ERR_CARD_DECLINED' }, null, 2),
        sourceRequirements: ['FR-04']
      }
    ],
    primaryService: 'Order Processing Service',
    externalProvider: 'Payment Gateway (Stripe/Adyen)',
    userActor: 'Customer / Buyer'
  },

  LOGISTICS: {
    titleSuffix: 'Logistics, Fleet Dispatch & Tracking Data Model',
    entities: [
      {
        name: 'Customer',
        description: 'Commercial shippers, consignors, and corporate freight accounts.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Customer UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'companyName', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Enterprise company name', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'contactEmail', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Billing and dispatch email', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'phone', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'Primary contact phone', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Registration timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-01']
      },
      {
        name: 'Warehouse',
        description: 'Physical distribution centers, fulfillment depots, and storage hubs.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Warehouse UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'code', type: 'VARCHAR(20)', constraints: 'UNIQUE, NOT NULL', description: 'Warehouse code (e.g. WH-EAST-01)', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Facility title', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'city', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'City location', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Created timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-01']
      },
      {
        name: 'Driver',
        description: 'Certified fleet drivers, commercial licensing, and shift assignments.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Driver UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'licenseNumber', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Commercial Driver License (CDL)', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Driver legal name', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'phone', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'Mobile dispatch phone', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'status', type: 'VARCHAR(20)', constraints: "DEFAULT 'AVAILABLE', NOT NULL", description: 'AVAILABLE, ON_DUTY, OFF_DUTY', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "'AVAILABLE'" }
        ],
        sourceRequirements: ['FR-02']
      },
      {
        name: 'Vehicle',
        description: 'Commercial cargo transport trucks, vans, and telematics GPS units.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Vehicle UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'vin', type: 'VARCHAR(30)', constraints: 'UNIQUE, NOT NULL', description: 'Vehicle Identification Number', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'plateNumber', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'License plate registration', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'capacityKg', type: 'DECIMAL(8,2)', constraints: 'NOT NULL', description: 'Payload capacity in kg', isPrimaryKey: false, isNullable: false, isUnique: false }
        ],
        sourceRequirements: ['FR-02']
      },
      {
        name: 'Shipment',
        description: 'Consolidated freight consignments, waybills, and origin/destination specs.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Shipment UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'trackingNumber', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Master tracking number', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'customerId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Customer.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Customer.id', isNullable: false, isUnique: false },
          { name: 'warehouseId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Warehouse.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Warehouse.id', isNullable: false, isUnique: false },
          { name: 'driverId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY', description: 'Assigned Driver.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Driver.id', isNullable: true, isUnique: false },
          { name: 'vehicleId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY', description: 'Assigned Vehicle.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Vehicle.id', isNullable: true, isUnique: false },
          { name: 'status', type: 'VARCHAR(30)', constraints: "DEFAULT 'MANIFESTED', NOT NULL", description: 'MANIFESTED, DISPATCHED, IN_TRANSIT, DELIVERED', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "'MANIFESTED'" },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Consignment booking timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-03', 'FR-04']
      },
      {
        name: 'TrackingEvent',
        description: 'Real-time telemetry and geofence checkpoint milestone events.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Event UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'shipmentId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Shipment.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Shipment.id', isNullable: false, isUnique: false },
          { name: 'latitude', type: 'DECIMAL(9,6)', constraints: 'NOT NULL', description: 'GPS Latitude coordinate', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'longitude', type: 'DECIMAL(9,6)', constraints: 'NOT NULL', description: 'GPS Longitude coordinate', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'eventDescription', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Milestone description', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'recordedAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Event timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-04', 'FR-05']
      }
    ],
    relations: [
      { from: 'Shipment.customerId', to: 'Customer.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { from: 'Shipment.warehouseId', to: 'Warehouse.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { from: 'Shipment.driverId', to: 'Driver.id', type: 'Many-to-One', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { from: 'Shipment.vehicleId', to: 'Vehicle.id', type: 'Many-to-One', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { from: 'TrackingEvent.shipmentId', to: 'Shipment.id', type: 'Many-to-One', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    endpoints: [
      {
        method: 'POST',
        endpoint: '/api/v1/shipments',
        name: 'Book Shipment',
        purpose: 'Ingest shipment manifest, allocate warehouse origin, and generate tracking bill.',
        description: 'Creates shipment record, assigns origin depot, and establishes tracking timeline.',
        primaryEntity: 'Shipment',
        relatedEntities: ['Warehouse', 'Driver', 'Vehicle'],
        fieldsUsed: ['warehouseId', 'trackingNumber', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: LogisticsCoordinator, Dispatcher',
        parameters: 'None (Request body payload)',
        requestBody: JSON.stringify({ warehouseId: 'wh_east_01', carrier: 'FreightX', totalWeightKg: 1200, destinationAddress: 'Chicago Central Terminal' }, null, 2),
        responseBody: JSON.stringify({ shipmentId: 'shp_99012', trackingNumber: 'TRK-2026-99012', status: 'MANIFESTED', estimatedDelivery: '2026-10-18T18:00:00Z' }, null, 2),
        statusCodes: [{ code: 201, description: 'Shipment booked.' }, { code: 400, description: 'Invalid cargo weight or destination.' }],
        errorResponse: JSON.stringify({ error: 'Bad Request', message: 'Warehouse code not recognized', code: 'ERR_WAREHOUSE_INVALID' }, null, 2),
        sourceRequirements: ['FR-01', 'FR-03']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/shipments',
        name: 'List Active Shipments',
        purpose: 'Query and filter shipments by route, status, or driver assignment.',
        description: 'Returns paginated list of shipments with current location status.',
        primaryEntity: 'Shipment',
        relatedEntities: ['Warehouse', 'Driver'],
        fieldsUsed: ['id', 'trackingNumber', 'warehouseId', 'driverId', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Dispatcher, FleetManager',
        parameters: '?status=IN_TRANSIT&warehouseId=wh_east_01&limit=25',
        requestBody: 'None',
        responseBody: JSON.stringify({ data: [{ id: 'shp_99012', trackingNumber: 'TRK-2026-99012', status: 'IN_TRANSIT', origin: 'WH-EAST-01' }], total: 1 }, null, 2),
        statusCodes: [{ code: 200, description: 'Shipments retrieved.' }],
        errorResponse: JSON.stringify({ error: 'Unauthorized', message: 'Token expired', code: 'ERR_AUTH_EXPIRED' }, null, 2),
        sourceRequirements: ['FR-03']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/shipments/:id/dispatch',
        name: 'Dispatch Shipment',
        purpose: 'Assign driver and vehicle to shipment and transition status to DISPATCHED.',
        description: 'Links driver CDL and truck VIN to shipment consignment and begins route tracking.',
        primaryEntity: 'Shipment',
        relatedEntities: ['Driver', 'Vehicle'],
        fieldsUsed: ['id', 'driverId', 'vehicleId', 'status'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Dispatcher',
        parameters: ':id (UUID)',
        requestBody: JSON.stringify({ driverId: 'drv_4410', vehicleId: 'veh_8812', departureTime: '2026-10-15T08:00:00Z' }, null, 2),
        responseBody: JSON.stringify({ shipmentId: 'shp_99012', status: 'DISPATCHED', driverAssigned: true }, null, 2),
        statusCodes: [{ code: 200, description: 'Shipment dispatched.' }, { code: 404, description: 'Shipment or driver not found.' }],
        errorResponse: JSON.stringify({ error: 'Conflict', message: 'Driver is already on an active route.', code: 'ERR_DRIVER_UNAVAILABLE' }, null, 2),
        sourceRequirements: ['FR-02', 'FR-04']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/tracking-events',
        name: 'Record Telemetry Event',
        purpose: 'Ingest GPS waypoint ping or geofence checkpoint from vehicle telematics.',
        description: 'Appends tracking milestone to shipment audit log for real-time customer visibility.',
        primaryEntity: 'TrackingEvent',
        relatedEntities: ['Shipment'],
        fieldsUsed: ['shipmentId', 'latitude', 'longitude', 'eventDescription'],
        authentication: 'API Key or Telematics Token',
        authorization: 'Telematics Gateway',
        parameters: 'None (Request body payload)',
        requestBody: JSON.stringify({ shipmentId: 'shp_99012', latitude: 41.8781, longitude: -87.6298, eventDescription: 'Arrived at Chicago Toll Plaza Geofence' }, null, 2),
        responseBody: JSON.stringify({ eventId: 'evt_00192', recordedAt: '2026-10-15T11:45:00Z', success: true }, null, 2),
        statusCodes: [{ code: 201, description: 'Event recorded.' }],
        errorResponse: JSON.stringify({ error: 'Bad Request', message: 'Invalid coordinates', code: 'ERR_INVALID_GEO' }, null, 2),
        sourceRequirements: ['FR-04', 'FR-05']
      }
    ],
    primaryService: 'Fleet Dispatch Service',
    externalProvider: 'Telematics & GPS Tracking Gateway',
    userActor: 'Fleet Dispatcher / Driver'
  },

  BANKING: {
    titleSuffix: 'Banking & Financial Transactions Data Model',
    entities: [
      {
        name: 'Customer',
        description: 'Banking account holders, legal identity, and KYC compliance status.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Customer UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'customerNumber', type: 'VARCHAR(30)', constraints: 'UNIQUE, NOT NULL', description: 'Unique CIF or Customer ID', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Legal name', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'kycStatus', type: 'VARCHAR(20)', constraints: "DEFAULT 'PENDING', NOT NULL", description: 'VERIFIED, PENDING, REJECTED', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "'PENDING'" },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Onboarding date', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-01', 'FR-05']
      },
      {
        name: 'Account',
        description: 'Deposit, savings, or checking accounts with balances and currency codes.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Account UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'accountNumber', type: 'VARCHAR(34)', constraints: 'UNIQUE, NOT NULL', description: 'IBAN or Account Number', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'customerId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Customer.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Customer.id', isNullable: false, isUnique: false },
          { name: 'accountType', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'CHECKING, SAVINGS, BUSINESS', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'balance', type: 'DECIMAL(15,2)', constraints: 'DEFAULT 0.00, NOT NULL', description: 'Current ledger balance', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: '0.00' },
          { name: 'currency', type: 'VARCHAR(3)', constraints: "DEFAULT 'USD', NOT NULL", description: 'ISO-4217 Currency Code', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: "'USD'" }
        ],
        sourceRequirements: ['FR-02']
      },
      {
        name: 'Transaction',
        description: 'Ledger debits and credits, transfer references, and audit logs.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Transaction UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'accountId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Account.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Account.id', isNullable: false, isUnique: false },
          { name: 'type', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'DEBIT, CREDIT, TRANSFER', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'amount', type: 'DECIMAL(15,2)', constraints: 'NOT NULL', description: 'Transaction value', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'description', type: 'VARCHAR(200)', constraints: 'NOT NULL', description: 'Narration / memo', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Execution timestamp', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-03', 'FR-04']
      }
    ],
    relations: [
      { from: 'Account.customerId', to: 'Customer.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { from: 'Transaction.accountId', to: 'Account.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    endpoints: [
      {
        method: 'POST',
        endpoint: '/api/v1/transactions',
        name: 'Execute Transfer',
        purpose: 'Execute fund transfer with ledger validation and balance deduction.',
        description: 'Transfers funds between accounts with atomic 2PC ACID guarantee.',
        primaryEntity: 'Transaction',
        relatedEntities: ['Account'],
        fieldsUsed: ['accountId', 'type', 'amount', 'description'],
        authentication: 'Bearer JWT + mTLS',
        authorization: 'Role: Customer, Teller',
        parameters: 'None (Request body payload)',
        requestBody: JSON.stringify({ sourceAccountId: 'acc_1001', destinationAccountId: 'acc_2002', amount: 500.00, memo: 'Invoice settlement' }, null, 2),
        responseBody: JSON.stringify({ transactionId: 'txn_9901', status: 'COMPLETED', reference: 'REF-881920' }, null, 2),
        statusCodes: [{ code: 201, description: 'Transfer executed.' }, { code: 400, description: 'Insufficient funds.' }],
        errorResponse: JSON.stringify({ error: 'Insufficient Funds', message: 'Account balance is less than transfer amount.', code: 'ERR_NSF' }, null, 2),
        sourceRequirements: ['FR-03']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/accounts/:id/balance',
        name: 'Get Account Balance',
        purpose: 'Fetch real-time available and ledger balance.',
        description: 'Returns real-time account summary with currency and pending authorizations.',
        primaryEntity: 'Account',
        relatedEntities: [],
        fieldsUsed: ['id', 'accountNumber', 'balance', 'currency'],
        authentication: 'Bearer JWT',
        authorization: 'Role: AccountHolder',
        parameters: ':id (UUID)',
        requestBody: 'None',
        responseBody: JSON.stringify({ accountId: 'acc_1001', balance: 14500.00, currency: 'USD' }, null, 2),
        statusCodes: [{ code: 200, description: 'Balance retrieved.' }],
        errorResponse: JSON.stringify({ error: 'Not Found', message: 'Account not found', code: 'ERR_ACCOUNT_NOT_FOUND' }, null, 2),
        sourceRequirements: ['FR-02']
      }
    ],
    primaryService: 'Core Banking Ledger Service',
    externalProvider: 'Payment Settlement Network (SWIFT/ACH)',
    userActor: 'Account Holder / Teller'
  },

  EDUCATION: {
    titleSuffix: 'Education, Courseware & Assessment Data Model',
    entities: [
      {
        name: 'Student',
        description: 'Enrolled students, academic matriculation IDs, and contact info.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Student UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'studentNumber', type: 'VARCHAR(30)', constraints: 'UNIQUE, NOT NULL', description: 'Matriculation ID', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Student full name', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Institutional email', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'createdAt', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL', description: 'Matriculation date', isPrimaryKey: false, isNullable: false, isUnique: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        sourceRequirements: ['FR-01']
      },
      {
        name: 'Course',
        description: 'Academic courses, curriculum catalogs, credits, and syllabus details.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Course UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'courseCode', type: 'VARCHAR(20)', constraints: 'UNIQUE, NOT NULL', description: 'Course code (e.g. CS-101)', isPrimaryKey: false, isNullable: false, isUnique: true },
          { name: 'title', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Course title', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'credits', type: 'INTEGER', constraints: 'NOT NULL', description: 'Credit hours', isPrimaryKey: false, isNullable: false, isUnique: false }
        ],
        sourceRequirements: ['FR-02']
      },
      {
        name: 'Enrollment',
        description: 'Student course registrations, semesters, and grade status.',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Enrollment UUID', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'uuid_generate_v4()' },
          { name: 'studentId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Student.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Student.id', isNullable: false, isUnique: false },
          { name: 'courseId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Course.id', isPrimaryKey: false, isForeignKey: true, foreignTarget: 'Course.id', isNullable: false, isUnique: false },
          { name: 'semester', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'Fall 2026, Spring 2027', isPrimaryKey: false, isNullable: false, isUnique: false },
          { name: 'finalGrade', type: 'VARCHAR(5)', constraints: '', description: 'Letter grade (A, B, C, etc.)', isPrimaryKey: false, isNullable: true, isUnique: false }
        ],
        sourceRequirements: ['FR-03', 'FR-04']
      }
    ],
    relations: [
      { from: 'Enrollment.studentId', to: 'Student.id', type: 'Many-to-One', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { from: 'Enrollment.courseId', to: 'Course.id', type: 'Many-to-One', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    endpoints: [
      {
        method: 'POST',
        endpoint: '/api/v1/enrollments',
        name: 'Register Course Enrollment',
        purpose: 'Enroll a student into an academic course for the active semester.',
        description: 'Validates course prerequisites, checks seat capacity, and registers enrollment.',
        primaryEntity: 'Enrollment',
        relatedEntities: ['Student', 'Course'],
        fieldsUsed: ['studentId', 'courseId', 'semester'],
        authentication: 'Bearer JWT',
        authorization: 'Role: Student, Registrar',
        parameters: 'None (Request body payload)',
        requestBody: JSON.stringify({ studentId: 'stu_101', courseId: 'crs_201', semester: 'Fall 2026' }, null, 2),
        responseBody: JSON.stringify({ enrollmentId: 'enr_8801', status: 'ENROLLED', confirmedDate: '2026-09-01' }, null, 2),
        statusCodes: [{ code: 201, description: 'Enrolled successfully.' }, { code: 400, description: 'Prerequisite missing or course full.' }],
        errorResponse: JSON.stringify({ error: 'Course Full', message: 'No seats available in CS-101.', code: 'ERR_CAPACITY_EXCEEDED' }, null, 2),
        sourceRequirements: ['FR-03']
      }
    ],
    primaryService: 'Academic Courseware Service',
    externalProvider: 'LMS & Grade Sync Gateway',
    userActor: 'Student / Academic Advisor'
  }
};

/**
 * Accurately classifies workspace domain from metadata and business statements
 */
export function identifyWorkspaceDomain(workspace) {
  if (!workspace) return 'ECOMMERCE';
  const combined = [
    workspace.name || '',
    workspace.industry || '',
    workspace.objective || '',
    workspace.challenge || '',
    workspace.targetUsers || '',
    workspace.expectedOutcome || ''
  ].join(' ').toLowerCase();

  if (
    combined.includes('patient') ||
    combined.includes('health') ||
    combined.includes('hospital') ||
    combined.includes('clinic') ||
    combined.includes('doctor') ||
    combined.includes('medical') ||
    combined.includes('appointment') ||
    combined.includes('triage')
  ) {
    return 'HEALTHCARE';
  }

  if (
    combined.includes('shipment') ||
    combined.includes('freight') ||
    combined.includes('logistics') ||
    combined.includes('dispatch') ||
    combined.includes('driver') ||
    combined.includes('vehicle') ||
    combined.includes('fleet') ||
    combined.includes('warehouse') ||
    combined.includes('delivery') ||
    combined.includes('tracking')
  ) {
    return 'LOGISTICS';
  }

  if (
    combined.includes('bank') ||
    combined.includes('account') ||
    combined.includes('transaction') ||
    combined.includes('ledger') ||
    combined.includes('loan') ||
    combined.includes('fintech') ||
    combined.includes('kyc') ||
    combined.includes('beneficiary') ||
    combined.includes('transfer')
  ) {
    return 'BANKING';
  }

  if (
    combined.includes('student') ||
    combined.includes('teacher') ||
    combined.includes('course') ||
    combined.includes('enrollment') ||
    combined.includes('curriculum') ||
    combined.includes('assignment') ||
    combined.includes('grade') ||
    combined.includes('school') ||
    combined.includes('university')
  ) {
    return 'EDUCATION';
  }

  // E-commerce is the clean enterprise standard for commercial platforms
  return 'ECOMMERCE';
}

/**
 * Normalizes an entity's fields, ensuring required flags (isPrimaryKey, isUnique, isNullable)
 */
export function normalizeEntity(rawEntity) {
  if (!rawEntity || typeof rawEntity !== 'object') return null;

  const rawFields = Array.isArray(rawEntity.fields) ? rawEntity.fields : [];
  const fields = rawFields.map((f, idx) => {
    const rawConstraints = (f.constraints || '').toUpperCase();
    const isPk = f.isPrimaryKey || rawConstraints.includes('PRIMARY KEY') || f.name === 'id' && idx === 0;
    const isFk = f.isForeignKey || rawConstraints.includes('FOREIGN KEY') || (f.name.endsWith('Id') && f.name !== 'id');
    const isUnique = f.isUnique || isPk || rawConstraints.includes('UNIQUE');
    const isNullable = f.isNullable !== undefined ? f.isNullable : !rawConstraints.includes('NOT NULL') && !isPk;

    let defaultValue = f.defaultValue !== undefined ? f.defaultValue : null;
    if (!defaultValue && rawConstraints.includes('DEFAULT')) {
      const match = rawConstraints.match(/DEFAULT\s+([^,\n]+)/i);
      if (match) defaultValue = match[1].trim();
    }

    return {
      name: f.name || `field_${idx + 1}`,
      type: f.type || 'VARCHAR(255)',
      constraints: f.constraints || (isPk ? 'PRIMARY KEY' : isUnique ? 'UNIQUE, NOT NULL' : isNullable ? '' : 'NOT NULL'),
      description: f.description || '',
      isPrimaryKey: isPk,
      isForeignKey: isFk,
      foreignTarget: f.foreignTarget || null,
      isUnique: isUnique,
      isNullable: isNullable,
      defaultValue: defaultValue
    };
  });

  // Ensure primary key exists
  if (!fields.some(f => f.isPrimaryKey)) {
    fields.unshift({
      name: 'id',
      type: 'VARCHAR(36)',
      constraints: 'PRIMARY KEY',
      description: 'Primary record identifier',
      isPrimaryKey: true,
      isForeignKey: false,
      isUnique: true,
      isNullable: false,
      defaultValue: 'uuid_generate_v4()'
    });
  }

  return {
    name: rawEntity.name || 'UntitledEntity',
    description: rawEntity.description || `Entity store for ${rawEntity.name || 'records'}`,
    fields,
    sourceRequirements: rawEntity.sourceRequirements || []
  };
}

/**
 * Normalizes foreign key relations
 */
export function normalizeRelation(r) {
  if (!r) return null;
  return {
    from: r.from || '',
    to: r.to || '',
    type: r.type || 'Many-to-One',
    onDelete: r.onDelete || 'RESTRICT',
    onUpdate: r.onUpdate || 'CASCADE'
  };
}

/**
 * Compiles PostgreSQL or SQLite SQL DDL script from normalized entities and relations
 */
export function generateSqlDdl(entities = [], relations = [], dialect = 'postgres') {
  const isSqlite = dialect === 'sqlite';
  const lines = [];

  lines.push(`-- ==========================================================`);
  lines.push(`-- ROOTFORGE 3NF RELATIONAL DATABASE SCHEMA DDL`);
  lines.push(`-- Target Dialect: ${isSqlite ? 'SQLite 3 (Embedded / Zero-Config)' : 'PostgreSQL 16 (Enterprise-Grade)'}`);
  lines.push(`-- Total Entities: ${entities.length} | Relations: ${relations.length}`);
  lines.push(`-- ==========================================================\n`);

  if (!isSqlite) {
    lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`);
  }

  entities.forEach((entity) => {
    const tableName = toSnakeCase(entity.name).toLowerCase();
    lines.push(`-- Entity: ${entity.name}`);
    if (entity.description) lines.push(`-- Description: ${entity.description}`);
    lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);

    const colDefinitions = [];
    const pkFields = (entity.fields || []).filter(f => f.isPrimaryKey);

    (entity.fields || []).forEach((f) => {
      let colName = toSnakeCase(f.name);
      let colDef = `  ${colName} `;
      let sqlColType = f.type || 'VARCHAR(255)';

      if (isSqlite) {
        if (sqlColType.includes('VARCHAR') || sqlColType.includes('TEXT')) sqlColType = 'TEXT';
        else if (sqlColType.includes('INT')) sqlColType = 'INTEGER';
        else if (sqlColType.includes('TIMESTAMP') || sqlColType.includes('DATE')) sqlColType = 'TEXT';
        else if (sqlColType.includes('BOOL')) sqlColType = 'INTEGER';
        else if (sqlColType.includes('DECIMAL') || sqlColType.includes('FLOAT')) sqlColType = 'REAL';
      }

      colDef += sqlColType;

      if (!f.isNullable || f.isPrimaryKey) {
        colDef += ' NOT NULL';
      }

      if (f.isUnique && !f.isPrimaryKey) {
        colDef += ' UNIQUE';
      }

      if (f.defaultValue) {
        let defVal = f.defaultValue;
        if (isSqlite && defVal.includes('uuid')) defVal = "(lower(hex(randomblob(16))))";
        colDef += ` DEFAULT ${defVal}`;
      }

      colDefinitions.push(colDef);
    });

    if (pkFields.length > 0) {
      colDefinitions.push(`  CONSTRAINT pk_${tableName} PRIMARY KEY (${pkFields.map(f => toSnakeCase(f.name)).join(', ')})`);
    }

    if (isSqlite) {
      relations.forEach((r) => {
        const [fromTable, fromCol] = (r.from || '').split('.');
        const [toTable, toCol] = (r.to || '').split('.');
        if (fromTable && fromTable.toLowerCase() === entity.name.toLowerCase()) {
          colDefinitions.push(
            `  FOREIGN KEY (${toSnakeCase(fromCol)}) REFERENCES ${toSnakeCase(toTable)}(${toSnakeCase(toCol)}) ON DELETE ${r.onDelete || 'RESTRICT'} ON UPDATE ${r.onUpdate || 'CASCADE'}`
          );
        }
      });
    }

    lines.push(colDefinitions.join(',\n'));
    lines.push(`);\n`);
  });

  if (!isSqlite && relations.length > 0) {
    lines.push(`-- ==========================================================`);
    lines.push(`-- FOREIGN KEY REFERENTIAL INTEGRITY CONSTRAINTS`);
    lines.push(`-- ==========================================================`);

    relations.forEach((r, idx) => {
      const [fromTable, fromCol] = (r.from || '').split('.');
      const [toTable, toCol] = (r.to || '').split('.');
      if (fromTable && fromCol && toTable && toCol) {
        const constraintName = `fk_${toSnakeCase(fromTable)}_${toSnakeCase(fromCol)}_${idx}`;
        lines.push(
          `ALTER TABLE ${toSnakeCase(fromTable)} ADD CONSTRAINT ${constraintName} ` +
          `FOREIGN KEY (${toSnakeCase(fromCol)}) REFERENCES ${toSnakeCase(toTable)}(${toSnakeCase(toCol)}) ` +
          `ON DELETE ${r.onDelete || 'RESTRICT'} ON UPDATE ${r.onUpdate || 'CASCADE'};`
        );
      }
    });
    lines.push('');
  }

  lines.push(`-- ==========================================================`);
  lines.push(`-- PERFORMANCE B-TREE INDEXES`);
  lines.push(`-- ==========================================================`);

  entities.forEach((e) => {
    const tName = toSnakeCase(e.name);
    (e.fields || []).forEach((f) => {
      if ((f.isForeignKey || f.name.endsWith('Id') || f.name.includes('status') || f.name.includes('code') || f.name.includes('email')) && !f.isPrimaryKey) {
        const idxName = `idx_${tName}_${toSnakeCase(f.name)}`;
        lines.push(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${tName} (${toSnakeCase(f.name)});`);
      }
    });
  });

  return lines.join('\n');
}

/**
 * Compiles Prisma ORM Schema from normalized entities and relations
 */
export function generatePrismaSchema(entities = [], relations = []) {
  const lines = [];

  lines.push(`// ==========================================================`);
  lines.push(`// ROOTFORGE PRISMA ORM SCHEMA DATA MODEL`);
  lines.push(`// Synchronized strictly with normalized relational entities`);
  lines.push(`// ==========================================================\n`);
  lines.push(`datasource db {`);
  lines.push(`  provider = "postgresql"`);
  lines.push(`  url      = env("DATABASE_URL")`);
  lines.push(`}\n`);
  lines.push(`generator client {`);
  lines.push(`  provider = "prisma-client-js"`);
  lines.push(`}\n`);

  entities.forEach((entity) => {
    lines.push(`model ${entity.name} {`);

    (entity.fields || []).forEach((f) => {
      let line = `  ${f.name.padEnd(18)} `;
      const t = (f.type || '').toUpperCase();
      let prismaType = 'String';
      if (t.includes('INT')) prismaType = 'Int';
      else if (t.includes('FLOAT') || t.includes('DECIMAL') || t.includes('NUMERIC')) prismaType = 'Float';
      else if (t.includes('BOOL')) prismaType = 'Boolean';
      else if (t.includes('TIMESTAMP') || t.includes('DATE') || t.includes('TIME')) prismaType = 'DateTime';
      else if (t.includes('JSON')) prismaType = 'Json';

      if (f.isNullable && !f.isPrimaryKey) {
        prismaType += '?';
      }

      line += prismaType.padEnd(12);

      const attrs = [];
      if (f.isPrimaryKey) {
        attrs.push('@id');
        if (prismaType.startsWith('String')) attrs.push('@default(uuid())');
      }

      if (f.isUnique && !f.isPrimaryKey) {
        attrs.push('@unique');
      }

      if (attrs.length > 0) {
        line += attrs.join(' ');
      }

      lines.push(line);
    });

    relations.forEach((r) => {
      const [fromTable, fromCol] = (r.from || '').split('.');
      const [toTable, toCol] = (r.to || '').split('.');

      if (fromTable === entity.name && toTable && fromCol && toCol) {
        const relationFieldName = toTable.charAt(0).toLowerCase() + toTable.slice(1);
        lines.push(`  ${relationFieldName.padEnd(18)} ${toTable.padEnd(12)} @relation(fields: [${fromCol}], references: [${toCol}])`);
      } else if (toTable === entity.name && fromTable && fromCol) {
        const reverseName = (fromTable.charAt(0).toLowerCase() + fromTable.slice(1)) + 's';
        lines.push(`  ${reverseName.padEnd(18)} ${fromTable}[]`);
      }
    });

    lines.push(`}\n`);
  });

  return lines.join('\n');
}

/**
 * Generates valid, complete OpenAPI 3.0.3 specification JSON from active canonical model
 */
export function generateOpenApiJson(model) {
  if (!model) return '{}';

  const schemas = {};
  (model.entities || []).forEach(e => {
    const properties = {};
    const required = [];

    (e.fields || []).forEach(f => {
      const t = (f.type || '').toUpperCase();
      let type = 'string';
      let format = undefined;

      if (t.includes('INT')) type = 'integer';
      else if (t.includes('FLOAT') || t.includes('DECIMAL')) type = 'number';
      else if (t.includes('BOOL')) type = 'boolean';
      else if (t.includes('TIMESTAMP') || t.includes('DATE')) {
        type = 'string';
        format = 'date-time';
      }

      properties[f.name] = {
        type,
        ...(format && { format }),
        description: f.description || `Property ${f.name}`
      };

      if (!f.isNullable || f.isPrimaryKey) {
        required.push(f.name);
      }
    });

    schemas[e.name] = {
      type: 'object',
      description: e.description || `${e.name} entity model`,
      required,
      properties
    };
  });

  const paths = {};
  (model.endpoints || []).forEach(ep => {
    const route = ep.endpoint || '/api/v1/resource';
    if (!paths[route]) paths[route] = {};

    const methodKey = (ep.method || 'GET').toLowerCase();
    const primaryEnt = ep.primaryEntity || 'Entity';

    const operation = {
      summary: ep.purpose || ep.name || `${ep.method} ${route}`,
      description: ep.description || ep.purpose || '',
      tags: [primaryEnt],
      operationId: `${methodKey}_${toSnakeCase(route).replace(/[^a-z0-9]/g, '_')}`,
      responses: {
        '200': {
          description: 'Operation successful.',
          content: {
            'application/json': {
              schema: schemas[primaryEnt]
                ? { $ref: `#/components/schemas/${primaryEnt}` }
                : { type: 'object' }
            }
          }
        },
        '400': {
          description: 'Validation error or invalid payload.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized JWT bearer token.'
        }
      }
    };

    // Request body for mutating methods
    if (['post', 'put', 'patch'].includes(methodKey)) {
      operation.requestBody = {
        required: true,
        description: `Payload for ${primaryEnt} mutation`,
        content: {
          'application/json': {
            schema: schemas[primaryEnt]
              ? { $ref: `#/components/schemas/${primaryEnt}` }
              : { type: 'object' }
          }
        }
      };
    }

    paths[route][methodKey] = operation;
  });

  const doc = {
    openapi: '3.0.3',
    info: {
      title: model.title || 'RootForge REST API Blueprint',
      version: `v${model.version || 1}`,
      description: `Comprehensive, OpenAPI 3.0.3 enterprise REST API contract for ${model.domain || 'Enterprise'} domain.`
    },
    servers: [{ url: '/api/v1', description: 'Enterprise API Gateway' }],
    paths,
    components: {
      schemas,
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Standard JSON Web Token authorization header'
        }
      }
    },
    security: [{ BearerAuth: [] }]
  };

  return JSON.stringify(doc, null, 2);
}

/**
 * Generates default multi-tier Integration Architecture components based on domain and active entities
 */
export function deriveDefaultIntegrations(domain = 'Enterprise', entities = [], template = null) {
  const primaryEntity = entities[0]?.name || 'Core';
  const entityNames = entities.map(e => e.name);
  const primaryService = template?.primaryService || `${primaryEntity} Core Orchestrator`;
  const extProvider = template?.externalProvider || 'Enterprise Notification & Webhook Hub';

  return [
    {
      id: 'node-client-web',
      name: 'RootForge Web Workspace',
      layer: 'Client',
      responsibility: `Operator portal and administrative workstation for ${domain}.`,
      technology: 'React 18 / Vite / Lucide',
      interfaces: ['HTTPS / WSS / REST'],
      connectedApis: ['All /api/v1/* Routes'],
      connectedEntities: entityNames,
      dependencies: ['node-gateway']
    },
    {
      id: 'node-client-mobile',
      name: 'Field & Mobile App',
      layer: 'Client',
      responsibility: `Mobile companion client for push alerts, queries, and check-ins.`,
      technology: 'React Native / iOS / Android',
      interfaces: ['HTTPS / Push Notifications'],
      connectedApis: ['GET /api/v1/*', 'POST /api/v1/*'],
      connectedEntities: [primaryEntity],
      dependencies: ['node-gateway']
    },
    {
      id: 'node-gateway',
      name: 'Enterprise API Gateway',
      layer: 'Gateway',
      responsibility: 'SSL termination, JWT verification, rate limiting, and reverse proxy routing.',
      technology: 'Kong / Envoy / Nginx Reverse Proxy',
      interfaces: ['REST / GraphQL / OIDC'],
      connectedApis: ['All /api/v1/* Routes'],
      connectedEntities: [],
      dependencies: ['node-service-core', 'node-idp']
    },
    {
      id: 'node-idp',
      name: 'Identity & Access Provider (IdP)',
      layer: 'External',
      responsibility: 'OAuth2 / OIDC Single Sign-On and RBAC token authority.',
      technology: 'Okta / Keycloak / Auth0',
      interfaces: ['OAuth2 / OpenID Connect'],
      connectedApis: ['/oauth/token'],
      connectedEntities: [],
      dependencies: []
    },
    {
      id: 'node-service-core',
      name: primaryService,
      layer: 'Service',
      responsibility: `Business rule execution, state machine orchestration, and transactional integrity for ${domain}.`,
      technology: 'Node.js Express / NestJS Microservice',
      interfaces: ['REST JSON API / gRPC'],
      connectedApis: ['All CRUD Endpoints'],
      connectedEntities: entityNames,
      dependencies: ['node-db-primary', 'node-cache', 'node-external']
    },
    {
      id: 'node-cache',
      name: 'In-Memory Cache & Session Store',
      layer: 'Persistence',
      responsibility: 'High-frequency read cache and distributed locks.',
      technology: 'Redis v7 Cluster',
      interfaces: ['RESP Protocol (Port 6379)'],
      connectedApis: ['GET /api/v1/*'],
      connectedEntities: [primaryEntity],
      dependencies: []
    },
    {
      id: 'node-db-primary',
      name: 'Primary Relational Database',
      layer: 'Persistence',
      responsibility: 'ACID transactional persistence for 3NF normalized tables with foreign keys and B-Tree indexes.',
      technology: 'PostgreSQL 16 / Amazon Aurora',
      interfaces: ['PostgreSQL Wire Protocol (Port 5432)'],
      connectedApis: ['All CRUD Endpoints'],
      connectedEntities: entityNames,
      dependencies: []
    },
    {
      id: 'node-external',
      name: extProvider,
      layer: 'External',
      responsibility: `External downstream integration, webhook dispatches, and third-party events.`,
      technology: 'REST Webhooks / HTTPS API',
      interfaces: ['HTTPS API / Webhooks'],
      connectedApis: ['POST /api/v1/*'],
      connectedEntities: [primaryEntity],
      dependencies: []
    }
  ];
}

/**
 * Generates default Data Flow sequence steps
 */
export function deriveDefaultDataFlow(domain = 'Enterprise', entities = [], endpoints = [], template = null) {
  const primaryEntity = entities[0]?.name || 'Resource';
  const userActor = template?.userActor || 'Authenticated User / Operator';
  const primaryService = template?.primaryService || `${primaryEntity} Core Service`;
  const extProvider = template?.externalProvider || 'Downstream Event Gateway';

  return [
    {
      step: 1,
      name: 'User Authentication & Session Handshake',
      actor: userActor,
      from: 'Web / Mobile Client',
      to: 'API Gateway & IdP',
      source: 'Web / Mobile Client',
      destination: 'API Gateway & IdP',
      protocol: 'HTTPS / OIDC JWT',
      payload: 'Bearer Token (Sub, Roles, Permissions)',
      direction: 'Client → Gateway → IdP',
      description: 'Client presents Bearer token; gateway validates cryptographic signature and role claims.'
    },
    {
      step: 2,
      name: 'Transactional Dispatch & Validation',
      actor: 'API Consumer',
      from: 'API Gateway',
      to: primaryService,
      source: 'API Gateway',
      destination: primaryService,
      protocol: 'gRPC / HTTP REST',
      payload: `Validated JSON Payload (${(entities[0]?.fields || []).slice(1, 4).map(f => f.name).join(', ')})`,
      direction: 'Gateway → Service',
      description: `Gateway routes incoming request to ${primaryService} for domain business rule validation.`
    },
    {
      step: 3,
      name: 'Atomic Persistence & Foreign Key Check',
      actor: primaryService,
      from: primaryService,
      to: 'PostgreSQL Database',
      source: primaryService,
      destination: 'PostgreSQL Database',
      protocol: 'TCP / Wire (5432)',
      payload: `SQL INSERT INTO ${toSnakeCase(primaryEntity).toLowerCase()} ... RETURNING id`,
      direction: 'Service → Database',
      description: `Database checks foreign key constraints on parent entities, writing record with ACID guarantees.`
    },
    {
      step: 4,
      name: 'Event Notification & External Dispatch',
      actor: 'Background Worker',
      from: primaryService,
      to: extProvider,
      source: primaryService,
      destination: extProvider,
      protocol: 'HTTPS Webhook / Event Stream',
      payload: `Event Notification Payload (${primaryEntity} Created)`,
      direction: 'Service → External Gateway',
      description: `Asynchronous event dispatched to ${extProvider} notifying downstream consumers of updated state.`
    }
  ];
}

/**
 * Multi-Rule Schema Validation Engine
 */
export function runSchemaValidation(entities = [], relations = [], endpoints = [], integrations = []) {
  const criticalIssues = [];
  const warnings = [];
  const suggestions = [];

  const entityNames = entities.map(e => e.name);

  // 1. Missing Primary Keys (Critical)
  entities.forEach((entity) => {
    const pks = (entity.fields || []).filter(f => f.isPrimaryKey);
    if (pks.length === 0) {
      criticalIssues.push({
        id: `pk-missing-${entity.name}`,
        category: 'Integrity',
        problem: `Entity "${entity.name}" has no declared Primary Key column.`,
        affectedItem: entity.name,
        explanation: 'Relational databases require a primary key on every table to uniquely address tuples.',
        recommendedFix: 'Add an "id" column of type VARCHAR(36) with PRIMARY KEY constraint.',
        fixType: 'ADD_PK',
        targetEntity: entity.name
      });
    }
  });

  // 2. Duplicate Field Names in Entity (Critical)
  entities.forEach((entity) => {
    const seen = new Set();
    (entity.fields || []).forEach((f) => {
      const lower = f.name.toLowerCase();
      if (seen.has(lower)) {
        criticalIssues.push({
          id: `dup-col-${entity.name}-${f.name}`,
          category: 'Integrity',
          problem: `Duplicate column name "${f.name}" detected in table "${entity.name}".`,
          affectedItem: `${entity.name}.${f.name}`,
          explanation: 'SQL standards prohibit duplicate column identifiers in the same table definition.',
          recommendedFix: `Rename or remove the duplicate field "${f.name}".`,
          fixType: 'REMOVE_DUPLICATE_FIELD',
          targetEntity: entity.name,
          fieldName: f.name
        });
      }
      seen.add(lower);
    });
  });

  // 3. Broken Foreign Key References (Critical)
  relations.forEach((r, rIdx) => {
    const [fromTable, fromCol] = (r.from || '').split('.');
    const [toTable, toCol] = (r.to || '').split('.');

    const sourceEntity = entities.find(e => e.name.toLowerCase() === (fromTable || '').toLowerCase());
    const targetEntity = entities.find(e => e.name.toLowerCase() === (toTable || '').toLowerCase());

    if (!sourceEntity) {
      criticalIssues.push({
        id: `fk-broken-source-${rIdx}`,
        category: 'Relational',
        problem: `Relation references non-existent source entity "${fromTable}".`,
        affectedItem: r.from,
        explanation: 'Foreign key points from an entity that is not declared in the active schema.',
        recommendedFix: `Remove relation or declare entity "${fromTable}".`,
        fixType: 'REMOVE_RELATION',
        relationIndex: rIdx
      });
    }

    if (!targetEntity) {
      criticalIssues.push({
        id: `fk-broken-target-${rIdx}`,
        category: 'Relational',
        problem: `Foreign key references undefined target entity "${toTable}".`,
        affectedItem: r.to,
        explanation: 'Target table referenced by foreign key does not exist in the database.',
        recommendedFix: `Create entity "${toTable}" or update relation target.`,
        fixType: 'REMOVE_RELATION',
        relationIndex: rIdx
      });
    }
  });

  // 4. Undeclared Foreign Keys (Warning)
  entities.forEach((entity) => {
    (entity.fields || []).forEach((f) => {
      if (f.name.endsWith('Id') && f.name !== 'id') {
        const potentialTarget = f.name.replace(/Id$/, '');
        const matched = entityNames.find(en => en.toLowerCase() === potentialTarget.toLowerCase());
        const hasRelation = relations.some(r => {
          const [fromT, fromC] = (r.from || '').split('.');
          return fromT?.toLowerCase() === entity.name.toLowerCase() && fromC?.toLowerCase() === f.name.toLowerCase();
        });

        if (!hasRelation && matched) {
          warnings.push({
            id: `fk-undeclared-${entity.name}-${f.name}`,
            category: 'Referential',
            problem: `Column "${entity.name}.${f.name}" appears to reference "${matched}.id" but has no declared foreign key relation.`,
            affectedItem: `${entity.name}.${f.name}`,
            explanation: 'Missing foreign key relationships allow orphan records to be inserted without referential constraint checking.',
            recommendedFix: `Declare explicit foreign key relation from "${entity.name}.${f.name}" to "${matched}.id".`,
            fixType: 'ADD_RELATION',
            relation: { from: `${entity.name}.${f.name}`, to: `${matched}.id`, type: 'Many-to-One' }
          });
        }
      }
    });
  });

  // 5. Missing B-Tree Index on Foreign Key Columns (Suggestion)
  entities.forEach((entity) => {
    (entity.fields || []).forEach((f) => {
      if (f.isForeignKey || (f.name.endsWith('Id') && f.name !== 'id')) {
        suggestions.push({
          id: `idx-fk-${entity.name}-${f.name}`,
          category: 'Performance',
          problem: `Join column "${entity.name}.${f.name}" should have a dedicated B-Tree index.`,
          affectedItem: `${entity.name}.${f.name}`,
          explanation: 'Foreign keys should be indexed to avoid full table scans during relational joins.',
          recommendedFix: `Include "CREATE INDEX idx_${entity.name.toLowerCase()}_${f.name.toLowerCase()}" in DDL.`,
          fixType: 'ADD_INDEX_HINT'
        });
      }
    });
  });

  // 6. Audit Field Completeness (Suggestion)
  entities.forEach((entity) => {
    const hasCreatedAt = (entity.fields || []).some(f => f.name === 'createdAt' || f.name === 'created_at');
    if (!hasCreatedAt) {
      suggestions.push({
        id: `audit-missing-${entity.name}`,
        category: 'Compliance',
        problem: `Entity "${entity.name}" lacks a "createdAt" audit timestamp column.`,
        affectedItem: entity.name,
        explanation: 'Enterprise data architecture standards recommend record creation timestamps.',
        recommendedFix: 'Add "createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP".',
        fixType: 'ADD_AUDIT_FIELD',
        targetEntity: entity.name
      });
    }
  });

  // Calculate score: 100 - (critical * 18) - (warnings * 6) - (suggestions * 2)
  const penalty = (criticalIssues.length * 18) + (warnings.length * 6) + (suggestions.length * 2);
  const score = Math.max(15, Math.min(100, 100 - penalty));

  return {
    score,
    passed: criticalIssues.length === 0,
    criticalIssues,
    warnings,
    suggestions,
    totalIssues: criticalIssues.length + warnings.length + suggestions.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Synthesizes the Complete Canonical Domain Model client-side from workspace context
 */
export function synthesizeCanonicalDomainModel(workspace) {
  const domain = identifyWorkspaceDomain(workspace);
  const template = DOMAIN_BLUEPRINTS[domain] || DOMAIN_BLUEPRINTS.ECOMMERCE;

  const entities = JSON.parse(JSON.stringify(template.entities)).map(normalizeEntity);
  const relations = JSON.parse(JSON.stringify(template.relations)).map(normalizeRelation);
  const endpoints = JSON.parse(JSON.stringify(template.endpoints));
  const integrations = deriveDefaultIntegrations(domain, entities, template);
  const dataFlows = deriveDefaultDataFlow(domain, entities, endpoints, template);
  const sqlSchema = generateSqlDdl(entities, relations, 'postgres');
  const prismaSchema = generatePrismaSchema(entities, relations);
  const validation = runSchemaValidation(entities, relations, endpoints, integrations);

  return {
    title: `${workspace?.name || domain} ${template.titleSuffix}`,
    version: 1,
    status: 'DRAFT',
    domain,
    entities,
    relations,
    endpoints,
    integrations,
    dataFlows,
    sqlSchema,
    prismaSchema,
    validation,
    lastSaved: new Date().toISOString()
  };
}

/**
 * Normalizes full studio view model from raw backend responses or workspace context
 */
export function normalizeDatabaseModel({ dbDesign, apiDesign, workspace, domain }) {
  const activeDomain = domain || identifyWorkspaceDomain(workspace);
  const template = DOMAIN_BLUEPRINTS[activeDomain] || DOMAIN_BLUEPRINTS.ECOMMERCE;

  // 1. Entities
  let rawEntities = safeParse(dbDesign?.entities);
  if (!Array.isArray(rawEntities) || rawEntities.length === 0) {
    rawEntities = template.entities;
  }
  const entities = rawEntities.map(normalizeEntity).filter(Boolean);

  // 2. Relations
  let rawRelations = safeParse(dbDesign?.relations);
  if (!Array.isArray(rawRelations) || rawRelations.length === 0) {
    rawRelations = template.relations;
  }
  const relations = rawRelations.map(normalizeRelation).filter(Boolean);

  // 3. Endpoints
  let rawEndpoints = safeParse(apiDesign?.endpoints);
  if (!Array.isArray(rawEndpoints) || rawEndpoints.length === 0) {
    rawEndpoints = template.endpoints;
  }
  const endpoints = rawEndpoints.map(ep => ({
    method: ep.method || 'GET',
    endpoint: ep.endpoint || '/api/v1/resource',
    name: ep.name || `${ep.method} ${ep.endpoint}`,
    purpose: ep.purpose || ep.description || 'API endpoint contract',
    description: ep.description || ep.purpose || '',
    authentication: ep.authentication || apiDesign?.authType || 'Bearer JWT',
    authorization: ep.authorization || 'Role: Authorized User',
    primaryEntity: ep.primaryEntity || entities[0]?.name || 'Entity',
    relatedEntities: ep.relatedEntities || [],
    fieldsUsed: ep.fieldsUsed || [],
    parameters: ep.parameters || 'None',
    requestBody: typeof ep.requestBody === 'object' ? JSON.stringify(ep.requestBody, null, 2) : (ep.requestBody || 'None'),
    responseBody: typeof ep.responseBody === 'object' ? JSON.stringify(ep.responseBody, null, 2) : (ep.responseBody || '{\n  "status": "OK"\n}'),
    statusCodes: Array.isArray(ep.statusCodes) ? ep.statusCodes : [
      { code: 200, description: 'Operation successful' },
      { code: 400, description: 'Validation error' },
      { code: 401, description: 'Unauthorized' }
    ],
    errorResponse: typeof ep.errorResponse === 'object' ? JSON.stringify(ep.errorResponse, null, 2) : (ep.errorResponse || '{\n  "error": "Bad Request"\n}'),
    sourceRequirements: ep.sourceRequirements || []
  }));

  // 4. Integration Architecture Nodes
  const integrations = deriveDefaultIntegrations(activeDomain, entities, template);

  // 5. Data Flow Steps
  const dataFlows = deriveDefaultDataFlow(activeDomain, entities, endpoints, template);

  // 6. SQL DDL
  const sqlSchema = dbDesign?.sqlSchema || generateSqlDdl(entities, relations, 'postgres');

  // 7. Prisma Schema
  const prismaSchema = dbDesign?.prismaSchema || generatePrismaSchema(entities, relations);

  // 8. Validation Report
  const validation = runSchemaValidation(entities, relations, endpoints, integrations);

  return {
    title: dbDesign?.title || `${workspace?.name || activeDomain} ${template.titleSuffix}`,
    version: dbDesign?.version || 1,
    status: dbDesign?.status || 'DRAFT',
    domain: activeDomain,
    entities,
    relations,
    endpoints,
    integrations,
    dataFlows,
    sqlSchema,
    prismaSchema,
    validation,
    lastSaved: dbDesign?.updatedAt || new Date().toISOString()
  };
}

/**
 * Derives end-to-end API to Database Entity & Field Traceability Matrix
 */
export function generateTraceabilityMatrix(endpoints = [], entities = [], relations = []) {
  return endpoints.map((ep) => {
    const primaryEntity = ep.primaryEntity || entities[0]?.name || 'Resource';
    const targetEntity = entities.find(e => e.name.toLowerCase() === primaryEntity.toLowerCase());

    const relatedEntities = (ep.relatedEntities && ep.relatedEntities.length > 0)
      ? ep.relatedEntities
      : relations
          .filter(r => (r.from || '').startsWith(`${primaryEntity}.`) || (r.to || '').startsWith(`${primaryEntity}.`))
          .map(r => (r.from || '').startsWith(`${primaryEntity}.`) ? (r.to || '').split('.')[0] : (r.from || '').split('.')[0])
          .filter(name => name && name.toLowerCase() !== primaryEntity.toLowerCase());

    const fieldsUsed = (ep.fieldsUsed && ep.fieldsUsed.length > 0)
      ? ep.fieldsUsed
      : (targetEntity?.fields || []).slice(0, 6).map(f => f.name);

    const service = ep.service || `${primaryEntity} Core Service`;

    return {
      method: ep.method || 'GET',
      endpoint: ep.endpoint || '/api/v1/resource',
      service,
      primaryEntity,
      relatedEntities: Array.from(new Set(relatedEntities)),
      fieldsUsed
    };
  });
}

