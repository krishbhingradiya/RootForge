import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const dbPath = path.resolve(backendDir, 'prisma', 'dev.db');
const outputDir = path.resolve(backendDir, 'csv_exports');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Field definitions for DateTime and Boolean per Prisma Schema
const dateTimeFields = new Set([
  'createdAt',
  'updatedAt',
  'lastMessageAt',
  'expiresAt',
  'verifiedAt',
  'approvedAt'
]);

const booleanFields = new Set([
  'emailVerified',
  'isDemo',
  'isArchived',
  'isRead',
  'isUserEdited'
]);

function toISOStringSafe(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 1000000000) {
      const d = new Date(num);
      return isNaN(d.getTime()) ? '' : d.toISOString();
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toISOString();
  }
  return '';
}

function toBooleanSafe(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val === 1 || val === '1' || val === true || val === 'true') return 'true';
  if (val === 0 || val === '0' || val === false || val === 'false') return 'false';
  return '';
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // If string contains quotes, commas, newlines, or carriage returns, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function convertRowsToCsv(columns, rows) {
  const header = columns.join(',');
  const lines = [header];

  for (const row of rows) {
    const rowValues = columns.map(col => {
      let val = row[col];
      if (dateTimeFields.has(col)) {
        val = toISOStringSafe(val);
      } else if (booleanFields.has(col)) {
        val = toBooleanSafe(val);
      }
      return escapeCsvCell(val);
    });
    lines.push(rowValues.join(','));
  }

  return lines.join('\n');
}

async function exportAllTables() {
  console.log(`Reading SQLite DB from: ${dbPath}`);
  console.log(`Writing CSV files to: ${outputDir}\n`);

  const tablesJson = execSync(
    `sqlite3 "${dbPath}" ".mode json" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name;"`,
    { encoding: 'utf-8' }
  );
  const tables = JSON.parse(tablesJson).map(t => t.name);

  // Recommended Dependency Order for Supabase import
  const orderedTables = [
    'Organization',
    'User',
    'EmailVerificationOTP',
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
    'Task',
    'ActivityLog',
    'ArtifactVersion',
    'ExportJob',
    'Approval',
    'Comment',
    'Notification'
  ];

  const summary = [];

  for (const table of orderedTables) {
    if (!tables.includes(table)) continue;

    // Get column info
    const colInfoJson = execSync(
      `sqlite3 "${dbPath}" ".mode json" "PRAGMA table_info(\\"${table}\\");"`,
      { encoding: 'utf-8' }
    );
    const columns = JSON.parse(colInfoJson).map(c => c.name);

    // Get all rows
    const rowsJson = execSync(
      `sqlite3 "${dbPath}" ".mode json" "SELECT * FROM \\"${table}\\";"`,
      { encoding: 'utf-8', maxBuffer: 150 * 1024 * 1024 }
    );
    const rows = rowsJson.trim() ? JSON.parse(rowsJson) : [];

    const csvContent = convertRowsToCsv(columns, rows);
    const filePath = path.join(outputDir, `${table}.csv`);
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    console.log(`✓ Exported ${table.padEnd(22)} -> ${rows.length.toString().padStart(5)} rows -> ${filePath}`);
    summary.push({ table, rows: rows.length, file: `${table}.csv` });
  }

  // Generate an import guide README
  const readmeContent = `# Supabase CSV Import Guide

All database tables have been exported to CSV format with:
- Standard RFC-4180 CSV compliance (correct escaping for multi-line JSON, prompts, quotes)
- ISO-8601 formatted timestamps (compatible with PostgreSQL \`TIMESTAMP WITH TIME ZONE\`)
- Standard boolean values (\`true\`/\`false\`)

## Recommended Import Order (Parent -> Child Dependencies)

When importing into Supabase via the **Table Editor -> Import data from CSV**, upload in this order so foreign keys resolve properly:

1. **\`Organization.csv\`** (${summary.find(s => s.table === 'Organization')?.rows || 0} rows)
2. **\`User.csv\`** (${summary.find(s => s.table === 'User')?.rows || 0} rows)
3. **\`EmailVerificationOTP.csv\`** (${summary.find(s => s.table === 'EmailVerificationOTP')?.rows || 0} rows)
4. **\`Workspace.csv\`** (${summary.find(s => s.table === 'Workspace')?.rows || 0} rows)
5. **\`Document.csv\`** (${summary.find(s => s.table === 'Document')?.rows || 0} rows)
6. **\`Conversation.csv\`** (${summary.find(s => s.table === 'Conversation')?.rows || 0} rows)
7. **\`Message.csv\`** (${summary.find(s => s.table === 'Message')?.rows || 0} rows)
8. **\`BusinessAnalysis.csv\`** (${summary.find(s => s.table === 'BusinessAnalysis')?.rows || 0} rows)
9. **\`Solution.csv\`** (${summary.find(s => s.table === 'Solution')?.rows || 0} rows)
10. **\`Architecture.csv\`** (${summary.find(s => s.table === 'Architecture')?.rows || 0} rows)
11. **\`ArchitectureNode.csv\`** (${summary.find(s => s.table === 'ArchitectureNode')?.rows || 0} rows)
12. **\`ArchitectureEdge.csv\`** (${summary.find(s => s.table === 'ArchitectureEdge')?.rows || 0} rows)
13. **\`ProcessModel.csv\`** (${summary.find(s => s.table === 'ProcessModel')?.rows || 0} rows)
14. **\`ProcessNode.csv\`** (${summary.find(s => s.table === 'ProcessNode')?.rows || 0} rows)
15. **\`UXDesign.csv\`** (${summary.find(s => s.table === 'UXDesign')?.rows || 0} rows)
16. **\`DatabaseDesign.csv\`** (${summary.find(s => s.table === 'DatabaseDesign')?.rows || 0} rows)
17. **\`ApiDesign.csv\`** (${summary.find(s => s.table === 'ApiDesign')?.rows || 0} rows)
18. **\`ImplementationPlan.csv\`** (${summary.find(s => s.table === 'ImplementationPlan')?.rows || 0} rows)
19. **\`Task.csv\`** (${summary.find(s => s.table === 'Task')?.rows || 0} rows)
20. **\`ActivityLog.csv\`** (${summary.find(s => s.table === 'ActivityLog')?.rows || 0} rows)
21. **\`ArtifactVersion.csv\`** (${summary.find(s => s.table === 'ArtifactVersion')?.rows || 0} rows)
22. **\`ExportJob.csv\`** (${summary.find(s => s.table === 'ExportJob')?.rows || 0} rows)
23. **\`Approval.csv\`** (${summary.find(s => s.table === 'Approval')?.rows || 0} rows)
24. **\`Comment.csv\`** (${summary.find(s => s.table === 'Comment')?.rows || 0} rows)
25. **\`Notification.csv\`** (${summary.find(s => s.table === 'Notification')?.rows || 0} rows)

---

### How to upload in Supabase:
1. Log into your **Supabase Dashboard**.
2. Select your Project -> Click **Table Editor** in the left sidebar.
3. Select the target table (or click **Insert -> Import data from CSV**).
4. Drag & drop the corresponding \`.csv\` file.
5. Review the column mappings (they match exact table column names) and click **Import**.
`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent, 'utf-8');
  console.log(`\n✓ All ${summary.length} CSV files generated successfully in ${outputDir}!`);
}

exportAllTables().catch(err => {
  console.error('Error during CSV export:', err);
  process.exit(1);
});
