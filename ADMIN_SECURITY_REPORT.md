# RootForge Admin Platform — Security & RBAC Audit Report

**Product:** RootForge (AI Solution Builder)  
**Security Scope:** Authentication, Authorization, RBAC, Tenant Isolation, Secret Management, Audit Logging  
**Date:** September 2026  
**Status:** High-Assurance Enterprise Compliance Verified

---

## 1. Authentication Security

1. **Mandatory Multi-Factor Authentication (2FA Email OTP):**
   - Implemented via [`backend/src/services/otpService.js`](file:///Users/JBC/Documents/Projects/rootforge%202/backend/src/services/otpService.js).
   - Generates cryptographically random 6-digit verification codes.
   - Enforces 30-second rate-limiting resend cooldown and 5-attempt maximum threshold before lockout.
   - Stores SHA-256 hashed OTPs in the database; plaintext OTPs are never persisted.

2. **Stateless JWT with Authoritative Database Validation:**
   - On every incoming API request, [`backend/src/middleware/auth.js`](file:///Users/JBC/Documents/Projects/rootforge%202/backend/src/middleware/auth.js#L18-L42) decodes the JWT and queries the live PostgreSQL database to fetch the authoritative user role and status.
   - **Protection:** Prevents stale JWT privilege escalation. If an admin demotes or suspends a user, the user is blocked immediately on their next HTTP request.

---

## 2. Server-Side RBAC Enforcement

1. **Route Level Guards:**
   - All `/api/admin/*` endpoints strictly enforce `requireRole('ADMIN')` in Express.
   - Unauthenticated requests receive HTTP 401 Unauthorized.
   - Non-admin authenticated users receive HTTP 403 Forbidden.

2. **Sole Administrator Protection Guard:**
   - [`backend/src/routes/admin.routes.js`](file:///Users/JBC/Documents/Projects/rootforge%202/backend/src/routes/admin.routes.js) verifies that an active Administrator cannot demote or delete themselves if they are the last remaining Administrator on the platform.

3. **Viewer Role Write Restrictions:**
   - [`backend/src/services/authorization.service.js`](file:///Users/JBC/Documents/Projects/rootforge%202/backend/src/services/authorization.service.js#L110-L112) enforces strict read-only restrictions for `VIEWER` roles, throwing HTTP 403 on write attempts.

---

## 3. Multi-Tenant Boundary Isolation

1. **Database Tenant Scoping:**
   - Standard users (Consultants, Analysts, Viewers) are strictly scoped to their own `organizationId` via `getTenantWorkspaceWhere` in `authorization.service.js`.
   - Cross-tenant requests to foreign workspaces return a safe **HTTP 404 Not Found** rather than HTTP 403, preventing enumeration attacks and leaking foreign tenant existence.

2. **Platform Admin Global Scope:**
   - Platform Administrators (`role === 'ADMIN'`) bypass tenant filters to facilitate system-wide governance and cross-tenant auditing.

---

## 4. Secret & AI Key Protection

1. **Zero Secret Leakage in Frontend:**
   - API keys for Google Gemini, OpenAI, and Anthropic are stored exclusively in backend environment variables or encrypted `SystemConfig`.
   - Telemetry endpoints (`GET /api/health/ai`, `GET /api/admin/ai/config`) sanitize all configuration, returning boolean flags (e.g. `isConfigured: true`) or masked keys (`••••••••••••`).

---

## 5. Immutable Audit Trail

1. **Event Logging Coverage:**
   - User creation, updating, role modification, and account deletion.
   - Organization creation and updating.
   - Workspace lifecycle changes and deletion.
   - AI configuration modifications.
   - User login events with timestamps and IP metadata.
2. **Audit Integrity:**
   - `ActivityLog` entries are append-only. There are NO endpoints in the API that allow deleting or editing audit log records.
