import { prisma } from '../prisma.js';

/**
 * Custom error class with HTTP status code support
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

/**
 * Returns Prisma `where` filter for workspace list queries scoped to the authenticated user.
 * ADMIN users can see all workspaces across organizations.
 * Standard users (CONSULTANT, ANALYST, VIEWER) are strictly restricted to their own organization.
 */
export function getTenantWorkspaceWhere(user) {
  if (!user) {
    throw new HttpError(401, 'Authentication required.');
  }

  // Platform ADMIN can see all workspaces
  if (user.role === 'ADMIN') {
    return {};
  }

  // Standard users are scoped to their organizationId or workspaces they created, plus demo workspaces
  const conditions = [
    { createdById: user.id },
    { isDemo: true },
    { id: 'ws-demo-customer-support' }
  ];
  if (user.organizationId) {
    conditions.push({ organizationId: user.organizationId });
  }
  return { OR: conditions };
}

/**
 * Validates and retrieves a workspace scoped to the authenticated user's organization.
 * 
 * Rules:
 * 1. If workspace does not exist -> returns safe 404
 * 2. If user is ADMIN -> allowed
 * 3. If workspace.organizationId !== user.organizationId -> returns safe 404 (does not leak foreign existence)
 * 4. If options.requireWrite is true and user.role is 'VIEWER' -> returns 403 (read-only restriction)
 * 
 * @param {string} workspaceId - Workspace CUID
 * @param {object} user - Authenticated user from req.user
 * @param {object} options - Optional parameters { include, requireWrite }
 * @returns {Promise<object>} Prisma workspace record
 */
export async function getAuthorizedWorkspace(workspaceId, user, options = {}) {
  if (!user) {
    throw new HttpError(401, 'Authentication required.');
  }

  if (!workspaceId) {
    throw new HttpError(400, 'Workspace ID is required.');
  }

  const query = {
    where: { id: workspaceId }
  };
  if (options.include) {
    query.include = options.include;
  }

  const workspace = await prisma.workspace.findUnique(query);

  // Safe 404: Workspace doesn't exist
  if (!workspace) {
    throw new HttpError(404, 'Workspace not found.');
  }

  // Tenant Boundary Check: Non-admins must strictly match workspace.organizationId or be the workspace creator
  if (user.role !== 'ADMIN') {
    const isDemo = workspace.isDemo || workspace.id === 'ws-demo-customer-support';
    const isCreator = workspace.createdById === user.id;
    const isSameTenant = Boolean(user.organizationId && workspace.organizationId && workspace.organizationId === user.organizationId);
    if (!isDemo && !isCreator && !isSameTenant) {
      // Safe 404: Foreign existence is never revealed
      throw new HttpError(404, 'Workspace not found.');
    }
  }

  // Role Write Permission Check:
  if (options.requireWrite) {
    if (user.role === 'VIEWER') {
      throw new HttpError(403, 'Access denied. Viewers have read-only permissions.');
    }
  }

  return workspace;
}

/**
 * Asserts read access to a workspace
 */
export async function assertWorkspaceAccess(workspaceId, user, options = {}) {
  return getAuthorizedWorkspace(workspaceId, user, options);
}

/**
 * Asserts write access to a workspace (tenant check + VIEWER role rejection)
 */
export async function assertWorkspaceWriteAccess(workspaceId, user, options = {}) {
  return getAuthorizedWorkspace(workspaceId, user, { ...options, requireWrite: true });
}

/**
 * Asserts access to a specific chat session within a workspace.
 * Validates:
 * 1. User has authorized access to workspaceId (tenant boundary check)
 * 2. Chat session exists in database
 * 3. Chat session belongs strictly to workspaceId (no cross-workspace chat leakage)
 * 4. If requireWrite: true, verifies user is not a read-only VIEWER
 */
export async function assertChatSessionAccess(chatId, workspaceId, user, options = {}) {
  await assertWorkspaceAccess(workspaceId, user, options);

  if (!chatId) {
    throw new HttpError(400, 'Chat session ID is required.');
  }

  const session = await prisma.conversation.findUnique({
    where: { id: chatId },
    include: options.include || undefined
  });

  if (!session || session.workspaceId !== workspaceId) {
    throw new HttpError(404, 'Chat session not found in this workspace.');
  }

  return session;
}

/**
 * Asserts that an organization ID is accessible by the user
 */
export function assertOrganizationAccess(organizationId, user) {
  if (!user) {
    throw new HttpError(401, 'Authentication required.');
  }
  if (user.role === 'ADMIN') {
    return true;
  }
  if (!user.organizationId || user.organizationId !== organizationId) {
    throw new HttpError(404, 'Organization not found.');
  }
  return true;
}

/**
 * Safe error responder for express route catch blocks
 */
export function handleRouteError(res, error, defaultMessage = 'Server error occurred.') {
  const code = error.code || 'PROVIDER_ERROR';
  const status = error.status || (
    error.code === 'AUTH_ERROR' ? 401 :
    error.code === 'KEY_MISSING' ? 401 :
    error.code === 'CONFIG_ERROR' ? 400 :
    error.code === 'RATE_LIMIT' ? 429 :
    error.code === 'TIMEOUT' ? 504 :
    500
  );
  console.error(defaultMessage, error);
  return res.status(status).json({
    error: error.message || defaultMessage,
    code
  });
}
