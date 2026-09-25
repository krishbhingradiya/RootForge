/**
 * Voice Discovery Service
 * 
 * Manages voice discovery session lifecycle, Twilio Call SID mapping,
 * status transitions, idempotency, and workspace linking.
 */

import { prisma } from '../prisma.js';
import { twilioService } from './twilio.service.js';
import { assertWorkspaceAccess, assertWorkspaceWriteAccess } from './authorization.service.js';

// Logical status mapping from Twilio CallStatus values
const TWILIO_STATUS_MAP = {
  initiated: 'INITIATED',
  ringing: 'RINGING',
  'in-progress': 'IN_PROGRESS',
  answered: 'CONNECTED',
  completed: 'COMPLETED',
  busy: 'FAILED',
  failed: 'FAILED',
  'no-answer': 'FAILED',
  canceled: 'CANCELLED',
  cancelled: 'CANCELLED'
};

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED'];

export class VoiceDiscoveryService {
  /**
   * Resolves or defaults a target workspace for an incoming call.
   */
  async resolveTargetWorkspace(requestedWorkspaceId, callerPhone) {
    if (requestedWorkspaceId) {
      const ws = await prisma.workspace.findUnique({
        where: { id: requestedWorkspaceId },
        select: { id: true, name: true, createdById: true }
      });
      if (ws) return ws;
    }

    // Try finding the most recent active non-demo workspace
    const defaultWs = await prisma.workspace.findFirst({
      where: { isDemo: false },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, createdById: true }
    });

    if (defaultWs) return defaultWs;

    // Fallback to any workspace
    return await prisma.workspace.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdById: true }
    });
  }

  /**
   * Creates a new Voice Discovery Session or returns the existing session (idempotent).
   * 
   * @param {object} params
   * @param {string} params.callSid - Twilio unique Call SID
   * @param {string} [params.from] - Caller phone number
   * @param {string} [params.to] - Twilio recipient phone number
   * @param {string} [params.callStatus] - Initial Twilio call status
   * @param {string} [params.workspaceId] - Target workspace ID if known
   * @param {string} [params.userId] - User ID if known
   * @returns {Promise<object>} VoiceDiscoverySession
   */
  async createOrGetIncomingSession({ callSid, from, to, callStatus, workspaceId = null, userId = null }) {
    if (!callSid) {
      const err = new Error('CallSid is required for voice discovery session.');
      err.statusCode = 400;
      throw err;
    }

    // Idempotency check: return existing session if already created for this CallSid
    const existing = await prisma.voiceDiscoverySession.findUnique({
      where: { twilioCallSid: callSid }
    });

    if (existing) {
      console.log(`[VOICE] Duplicate incoming webhook for existing Call SID: ${callSid}. Returning session: ${existing.id}`);
      return existing;
    }

    // Resolve target workspace
    const targetWs = await this.resolveTargetWorkspace(workspaceId, from);
    const mappedStatus = TWILIO_STATUS_MAP[callStatus?.toLowerCase()] || 'INITIATED';

    console.log(`[VOICE] Incoming call from: ${from || 'Unknown'} to: ${to || 'Twilio'} | Call SID: ${callSid}`);

    const session = await prisma.voiceDiscoverySession.create({
      data: {
        twilioCallSid: callSid,
        callerPhone: from || null,
        recipientPhone: to || null,
        workspaceId: targetWs?.id || null,
        userId: userId || targetWs?.createdById || null,
        channel: 'VOICE',
        provider: 'TWILIO',
        status: mappedStatus,
        language: 'auto',
        startedAt: new Date(),
        connectedAt: mappedStatus === 'IN_PROGRESS' || mappedStatus === 'CONNECTED' ? new Date() : null,
        callData: JSON.stringify({
          initialCallStatus: callStatus,
          resolvedWorkspaceName: targetWs?.name || 'Unassigned'
        })
      }
    });

    console.log(`[VOICE] Discovery session created: ${session.id} | Workspace: ${targetWs?.id || 'Unassigned'} | Status: ${session.status}`);
    return session;
  }

  /**
   * Handles Twilio status callback events (ringing, in-progress, completed, failed, busy, no-answer).
   * 
   * @param {object} params
   * @param {string} params.callSid - Twilio Call SID
   * @param {string} params.callStatus - Twilio status string
   * @param {string|number} [params.callDuration] - Call duration in seconds if completed
   * @param {string} [params.from] - Caller phone
   * @param {string} [params.to] - Recipient phone
   * @param {object} [params.rawBody] - Raw webhook body metadata
   * @returns {Promise<object>} Updated VoiceDiscoverySession
   */
  async handleCallStatusWebhook({ callSid, callStatus, callDuration = null, from = null, to = null, rawBody = {} }) {
    if (!callSid) {
      const err = new Error('CallSid is required for status callback.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedStatus = (callStatus || '').toLowerCase().trim();
    const mappedStatus = TWILIO_STATUS_MAP[normalizedStatus] || 'IN_PROGRESS';

    console.log(`[VOICE] Status callback received for Call SID: ${callSid} | Twilio Status: ${callStatus} -> Internal: ${mappedStatus}`);

    // Find existing session
    let session = await prisma.voiceDiscoverySession.findUnique({
      where: { twilioCallSid: callSid }
    });

    // If session doesn't exist yet (e.g. status event arrived before incoming webhook in edge cases), create it
    if (!session) {
      console.log(`[VOICE] Session not found for Call SID: ${callSid}. Creating from status callback.`);
      return await this.createOrGetIncomingSession({
        callSid,
        from,
        to,
        callStatus
      });
    }

    // Idempotency: Do not overwrite terminal state if an out-of-order event arrives
    if (TERMINAL_STATUSES.includes(session.status) && !TERMINAL_STATUSES.includes(mappedStatus)) {
      console.log(`[VOICE] Ignoring non-terminal status '${mappedStatus}' because session is already in terminal state '${session.status}'.`);
      return session;
    }

    const updateData = {
      status: mappedStatus,
      updatedAt: new Date()
    };

    // Record connectedAt timestamp on initial connection
    if ((mappedStatus === 'IN_PROGRESS' || mappedStatus === 'CONNECTED') && !session.connectedAt) {
      updateData.connectedAt = new Date();
      console.log(`[VOICE] Call connected: ${callSid} at ${updateData.connectedAt.toISOString()}`);
    }

    // Record endedAt and duration on completion/failure
    if (TERMINAL_STATUSES.includes(mappedStatus)) {
      updateData.endedAt = new Date();
      
      const parsedDuration = parseInt(callDuration, 10);
      if (!isNaN(parsedDuration) && parsedDuration >= 0) {
        updateData.durationSeconds = parsedDuration;
      } else {
        const start = session.connectedAt || session.startedAt;
        const durSeconds = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000));
        updateData.durationSeconds = durSeconds;
      }

      console.log(`[VOICE] Call ${mappedStatus.toLowerCase()}: ${callSid} | Duration: ${updateData.durationSeconds}s`);
    }

    // Preserve metadata
    try {
      const prevMeta = session.callData ? JSON.parse(session.callData) : {};
      updateData.callData = JSON.stringify({
        ...prevMeta,
        lastTwilioStatus: callStatus,
        lastCallbackAt: new Date().toISOString(),
        ...(rawBody?.Duration ? { rawDuration: rawBody.Duration } : {})
      });
    } catch {}

    const updated = await prisma.voiceDiscoverySession.update({
      where: { id: session.id },
      data: updateData
    });

    return updated;
  }

  /**
   * Retrieves a single voice discovery session by ID with authorization check.
   */
  async getSession(sessionId, user) {
    if (!sessionId) {
      const err = new Error('Session ID is required.');
      err.statusCode = 400;
      throw err;
    }

    const session = await prisma.voiceDiscoverySession.findUnique({
      where: { id: sessionId },
      include: {
        workspace: {
          select: { id: true, name: true, organizationId: true }
        }
      }
    });

    if (!session) {
      const err = new Error('Voice discovery session not found.');
      err.statusCode = 404;
      throw err;
    }

    // Verify workspace access if session is attached to a workspace
    if (session.workspaceId && user) {
      await assertWorkspaceAccess(session.workspaceId, user);
    }

    return this.sanitizeSession(session);
  }

  /**
   * Lists voice discovery sessions for a workspace with authorization check.
   */
  async listWorkspaceSessions(workspaceId, user) {
    if (!workspaceId) {
      const err = new Error('Workspace ID is required.');
      err.statusCode = 400;
      throw err;
    }

    if (user) {
      await assertWorkspaceAccess(workspaceId, user);
    }

    const sessions = await prisma.voiceDiscoverySession.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return sessions.map(s => this.sanitizeSession(s));
  }

  /**
   * Safely terminates an active voice discovery call via Twilio and marks session COMPLETED.
   */
  async endSessionCall(sessionId, user) {
    const session = await prisma.voiceDiscoverySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      const err = new Error('Voice discovery session not found.');
      err.statusCode = 404;
      throw err;
    }

    if (session.workspaceId && user) {
      await assertWorkspaceWriteAccess(session.workspaceId, user);
    }

    if (TERMINAL_STATUSES.includes(session.status)) {
      return this.sanitizeSession(session);
    }

    // Terminate call in Twilio if CallSid exists
    if (session.twilioCallSid && twilioService.isConfigured()) {
      try {
        await twilioService.endCall(session.twilioCallSid);
      } catch (err) {
        console.warn(`[VOICE] Twilio endCall notice for ${session.twilioCallSid}:`, err.message);
      }
    }

    const endedAt = new Date();
    const start = session.connectedAt || session.startedAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - new Date(start).getTime()) / 1000));

    const updated = await prisma.voiceDiscoverySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt,
        durationSeconds,
        updatedAt: endedAt
      }
    });

    console.log(`[VOICE] Session manually terminated: ${sessionId} | Duration: ${durationSeconds}s`);
    return this.sanitizeSession(updated);
  }

  /**
   * Returns a sanitized, safe representation of the session object (no secrets).
   */
  sanitizeSession(session) {
    if (!session) return null;
    return {
      id: session.id,
      workspaceId: session.workspaceId,
      userId: session.userId,
      channel: session.channel,
      provider: session.provider,
      status: session.status,
      language: session.language,
      callerPhone: session.callerPhone ? session.callerPhone.replace(/\d(?=\d{4})/g, '*') : null, // Mask partial digits for privacy
      startedAt: session.startedAt,
      connectedAt: session.connectedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }
}

export const voiceDiscoveryService = new VoiceDiscoveryService();
