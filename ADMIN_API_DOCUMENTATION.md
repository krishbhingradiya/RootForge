# RootForge Admin Platform — API Reference Documentation

**Base Path:** `/api/admin`  
**Authentication:** Mandatory `Authorization: Bearer <JWT>` with `role: "ADMIN"`  
**Protocol:** REST / JSON  
**Error Handling:** Standardized HTTP Status codes with JSON error payloads: `{ "error": "Description" }`

---

## 1. System Telemetry & Overview Endpoints

### `GET /api/admin/metrics`
Returns complete real-time platform statistics, database health, memory heap, and recent audit activity.
- **Response `200 OK`**:
```json
{
  "metrics": {
    "totalUsers": 72,
    "activeUsers": 71,
    "totalOrgs": 14,
    "activeOrgs": 14,
    "totalWorkspaces": 38,
    "totalProjects": 38,
    "totalDocs": 42,
    "totalSolutions": 28,
    "totalArtifacts": 156,
    "totalAuditLogs": 2957,
    "activeAlertsCount": 2,
    "integrationsCount": 4,
    "totalAiTokensUsed": 458200
  },
  "systemHealth": {
    "status": "HEALTHY",
    "database": {
      "status": "HEALTHY",
      "latencyMs": 14,
      "provider": "PostgreSQL (Supabase High-Availability Enterprise Cluster)"
    },
    "process": {
      "uptimeHours": "1.25",
      "heapUsedMB": "34.2",
      "heapTotalMB": "68.0",
      "nodeVersion": "v26.7.0"
    },
    "ai": {
      "provider": "gemini",
      "model": "gemini-3.1-flash-lite"
    }
  },
  "recentActivity": [ ... ],
  "recentAlerts": [ ... ]
}
```

### `GET /api/admin/ai/health`
Executes an active health ping test against the configured AI provider.
- **Response `200 OK`**: `{ "provider": "gemini", "status": "healthy", "model": "gemini-3.1-flash-lite", "authenticated": true }`

---

## 2. User Management Endpoints

### `GET /api/admin/users`
Lists filtered, searched, and paginated enterprise users.
- **Query Params:** `search` (string), `role` (ADMIN, CONSULTANT, ANALYST, VIEWER), `status` (ACTIVE, SUSPENDED, DEACTIVATED), `page` (number), `limit` (number).
- **Response `200 OK`**: `{ "total": 72, "page": 1, "totalPages": 2, "users": [ ... ] }`

### `GET /api/admin/users/:userId`
Returns detailed profile, created workspaces, and audit history for a single user.

### `POST /api/admin/users`
Provisions a new enterprise user.
- **Body:** `{ "name": "John Doe", "email": "john@acme.com", "password": "...", "role": "CONSULTANT", "organizationName": "Acme Corp", "status": "ACTIVE" }`
- **Response `201 Created`**: `{ "user": { "id": "...", "email": "...", "name": "...", "role": "..." } }`

### `PATCH /api/admin/users/:userId`
Updates user name, email, role, status, or organization.
- **Body:** `{ "name": "...", "role": "ADMIN", "status": "ACTIVE", "organizationId": "..." }`
- **Response `200 OK`**: `{ "user": { ... } }`

### `DELETE /api/admin/users/:userId`
Deletes a user account. Blocked if target is the sole surviving Administrator.
- **Response `200 OK`**: `{ "success": true, "message": "User deleted." }`

---

## 3. Organization Management Endpoints

### `GET /api/admin/organizations`
Lists all tenant organizations with member count, workspace count, and cumulative tokens used.
- **Query Params:** `search` (string), `status` (ACTIVE, SUSPENDED), `plan` (ENTERPRISE, PROFESSIONAL, STARTER).

### `POST /api/admin/organizations`
Creates a new tenant organization.
- **Body:** `{ "name": "Acme Global", "industry": "Retail", "plan": "ENTERPRISE", "status": "ACTIVE" }`
- **Response `201 Created`**: `{ "organization": { ... } }`

### `PATCH /api/admin/organizations/:id`
Updates organization metadata, plan tier, or status.

### `DELETE /api/admin/organizations/:id`
Deletes an organization record.

---

## 4. Workspace & Project Governance Endpoints

### `GET /api/admin/workspaces`
Returns all workspaces across all tenant organizations with owner, stage status, tokens used, and artifact counts.
- **Query Params:** `search` (string), `status` (string), `organizationId` (string).

### `PATCH /api/admin/workspaces/:id`
Updates workspace metadata or reassigns organization.

### `DELETE /api/admin/workspaces/:id`
Deletes a workspace.

---

## 5. RBAC & Roles Endpoints

### `GET /api/admin/roles`
Returns all 5 platform roles, their granted permission arrays, and the live count of assigned users.

---

## 6. AI Model Management & Governance Endpoints

### `GET /api/admin/ai/config`
Returns active AI configuration (provider, model, temperature, maxTokens, stage flags) and list of supported providers without exposing secret keys.

### `POST /api/admin/ai/config`
Updates active AI provider, model, API key, and stage real AI execution flags.
- **Body:** `{ "provider": "gemini", "model": "gemini-3.1-flash-lite", "apiKey": "...", "temperature": 0.3, "stageFlags": { "analysis": true, "solutions": true } }`

### `GET /api/admin/ai/usage`
Returns token consumption leaderboards grouped by organization and workspace.

---

## 7. Audit Trail Endpoints

### `GET /api/admin/audit-logs`
Returns searchable, filterable, and paginated immutable audit log events.
- **Query Params:** `search` (string), `action` (string), `resource` (string), `status` (string), `page` (number), `limit` (number).

---

## 8. Integrations & Alert Endpoints

### `GET /api/admin/integrations`
Lists configured enterprise connectors (Jira, GitHub, Slack, Azure DevOps).

### `POST /api/admin/integrations/:id/toggle`
Enables or disables an integration connector.
- **Body:** `{ "isEnabled": true }`

### `GET /api/admin/alerts`
Returns platform and security alerts.

### `PATCH /api/admin/alerts/:id/read`
Acknowledges an alert.

### `POST /api/admin/alerts/broadcast`
Broadcasts an administrative announcement.
- **Body:** `{ "title": "Notice", "message": "...", "severity": "INFO", "category": "SYSTEM" }`
