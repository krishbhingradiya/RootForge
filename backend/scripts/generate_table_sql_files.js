import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const dbPath = path.resolve(backendDir, 'prisma', 'dev.db');
const outputDir = path.resolve(backendDir, 'prisma', 'sql_tables');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function getSqliteRows(tableName) {
  try {
    const raw = execSync(`sqlite3 "${dbPath}" ".mode json" "SELECT * FROM \\"${tableName}\\";"`, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024
    });
    if (!raw || !raw.trim()) return [];
    return JSON.parse(raw.trim());
  } catch (err) {
    console.warn(`[WARN] Could not read table ${tableName}: ${err.message}`);
    return [];
  }
}

function escapeSqlString(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? val.toString() : 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

function formatValue(colName, val) {
  if (val === null || val === undefined) return 'NULL';
  
  // Date columns
  const dateCols = ['createdAt', 'updatedAt', 'lastMessageAt', 'expiresAt', 'verifiedAt', 'submittedAt', 'resolvedAt'];
  if (dateCols.includes(colName)) {
    if (typeof val === 'number') {
      const d = new Date(val);
      return `'${d.toISOString()}'`;
    }
    if (typeof val === 'string') {
      const num = Number(val);
      if (!isNaN(num) && num > 1000000000) {
        return `'${new Date(num).toISOString()}'`;
      }
      return `'${new Date(val).toISOString()}'`;
    }
  }

  // Boolean columns
  const boolCols = ['emailVerified', 'isDemo', 'isArchived', 'read'];
  if (boolCols.includes(colName)) {
    return (val === 1 || val === true || val === '1' || val === 'true') ? 'TRUE' : 'FALSE';
  }

  // Numeric columns
  const numCols = [
    'attempts', 'maxAttempts', 'aiTokensUsed', 'fileSize', 'version',
    'digitalMaturityScore', 'sourceAnalysisVersion', 'confidence',
    'posX', 'posY', 'order'
  ];
  if (numCols.includes(colName)) {
    const n = Number(val);
    return isNaN(n) ? 'NULL' : n.toString();
  }

  return escapeSqlString(val);
}

// Table order respecting foreign keys
const tables = [
  'Workspace',
  'Document',
  'Conversation',
  'Message',
  'BusinessAnalysis',
  'Solution',
  'Architecture',
  'ArchitectureNode',
  'ArchitectureEdge',
  'ProcessModel',
  'ProcessNode',
  'UXDesign',
  'DatabaseDesign',
  'ApiDesign',
  'ImplementationPlan',
  'ActivityLog',
  'ArtifactVersion',
  'ExportJob',
  'Notification',
  'Task',
  'Approval',
  'Comment'
];

function generateBatchedSql(tableName, rows, columns, colNamesStr, batchSize = 40) {
  let sqlContent = '';
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    sqlContent += `INSERT INTO "${tableName}" (${colNamesStr}) VALUES\n`;
    
    const valueRows = batch.map(row => {
      const vals = columns.map(col => formatValue(col, row[col]));
      return `  (${vals.join(', ')})`;
    });

    sqlContent += valueRows.join(',\n');
    sqlContent += `\nON CONFLICT ("id") DO NOTHING;\n\n`;
  }
  return sqlContent;
}

console.log('Generating Table-wise SQL Scripts in backend/prisma/sql_tables/ ...\n');

let summary = [];

tables.forEach((tableName, idx) => {
  const filePrefix = String(idx + 1).padStart(2, '0');
  const fileName = `${filePrefix}_${tableName}.sql`;
  const filePath = path.join(outputDir, fileName);

  const rows = getSqliteRows(tableName);
  if (rows.length === 0) {
    fs.writeFileSync(filePath, `-- Table: "${tableName}" (0 records)\n-- No records to insert.\n`, 'utf-8');
    summary.push({ table: tableName, file: fileName, count: 0, sizeKB: 0, parts: 1 });
    return;
  }

  const columns = Object.keys(rows[0]);
  const colNamesStr = columns.map(c => `"${c}"`).join(', ');

  let header = `-- ====================================================\n`;
  header += `-- Table: "${tableName}"\n`;
  header += `-- Total Records: ${rows.length}\n`;
  header += `-- Instructions: Run this script directly in the Supabase SQL Editor\n`;
  header += `-- ====================================================\n\n`;

  const fullSql = header + generateBatchedSql(tableName, rows, columns, colNamesStr);
  fs.writeFileSync(filePath, fullSql, 'utf-8');

  const fullSizeKB = Math.round(fs.statSync(filePath).size / 1024);

  // If larger than 2MB, also generate split parts for ultra-smooth pasting into browser SQL Editor
  let partsCount = 1;
  if (fullSizeKB > 2000) {
    const chunkSize = tableName === 'ArtifactVersion' ? 400 : 200;
    const numParts = Math.ceil(rows.length / chunkSize);
    partsCount = numParts;
    for (let p = 0; p < numParts; p++) {
      const partRows = rows.slice(p * chunkSize, (p + 1) * chunkSize);
      const partFileName = `${filePrefix}_${tableName}_part${p + 1}.sql`;
      const partFilePath = path.join(outputDir, partFileName);
      let partHeader = `-- Table "${tableName}" - Part ${p + 1} of ${numParts} (Rows ${p * chunkSize + 1} to ${Math.min((p + 1) * chunkSize, rows.length)})\n\n`;
      const partSql = partHeader + generateBatchedSql(tableName, partRows, columns, colNamesStr);
      fs.writeFileSync(partFilePath, partSql, 'utf-8');
    }
  }

  summary.push({
    table: tableName,
    file: fileName,
    count: rows.length,
    sizeKB: fullSizeKB,
    parts: partsCount
  });
});

console.log('✅ Generated all table SQL files successfully!');
console.table(summary);
