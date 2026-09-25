/**
 * Enterprise Twilio Media Stream WebSocket Handler
 * 
 * Handles:
 * 1. Twilio Bi-directional Media Stream events (connected, start, media, stop, mark).
 * 2. Real-time audio ingestion without buffering entire calls in memory.
 * 3. Session lifecycle tracking and automatic teardown in PostgreSQL.
 * 4. Architecture integration hooks for Sarvam STT, Groq LLM, and Voice TTS.
 */

import { twilioVoiceService } from './twilioVoice.service.js';

// Active stream sessions map: streamSid -> session state & listeners
const activeStreams = new Map();

export class VoiceStreamService {
  constructor() {
    this.name = 'voice-stream-service';
  }

  /**
   * Attaches WebSocket connection handler for Twilio Media Stream
   */
  handleConnection(ws, req) {
    let currentStreamSid = null;
    let currentCallSid = null;
    let currentSessionId = null;
    let audioChunkCount = 0;

    console.log('[VoiceStream] New Twilio WebSocket connection initiated.');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.event) {
          case 'connected':
            console.log('[VoiceStream] Twilio stream protocol connected:', data.protocol || 'call');
            break;

          case 'start': {
            currentStreamSid = data.streamSid || data.start?.streamSid;
            currentCallSid = data.start?.callSid || data.callSid;
            const customParams = data.start?.customParameters || data.customParameters || {};
            currentSessionId = customParams.sessionId || customParams.session_id || null;

            console.log(`[VoiceStream] Stream started. Stream SID: ${currentStreamSid}, Call SID: ${currentCallSid?.slice(0, 8) || 'N/A'}..., Session ID: ${currentSessionId || 'N/A'}`);

            // Find and link voice session in DB
            let session = null;
            if (currentSessionId) {
              session = await twilioVoiceService.getSession(currentSessionId);
            }
            if (!session && currentCallSid) {
              session = await twilioVoiceService.getSession(currentCallSid);
            }

            if (session) {
              currentSessionId = session.id;
              await twilioVoiceService.updateSession(session.id, {
                twilioStreamSid: currentStreamSid,
                twilioCallSid: currentCallSid || session.twilioCallSid,
                status: 'active'
              });
              console.log(`[VoiceSession] Session ${session.id} linked to Stream SID ${currentStreamSid}`);
            }

            // Register active stream context
            activeStreams.set(currentStreamSid, {
              ws,
              sessionId: currentSessionId,
              callSid: currentCallSid,
              streamSid: currentStreamSid,
              startedAt: Date.now(),
              audioChunkCount: 0,
              sarvamClient: null
            });

            break;
          }

          case 'media': {
            if (!currentStreamSid) break;
            audioChunkCount++;

            const payload = data.media?.payload; // base64 encoded audio/x-mulaw chunk (8000Hz)
            const streamContext = activeStreams.get(currentStreamSid);

            if (streamContext) {
              streamContext.audioChunkCount = audioChunkCount;

              // Architecture Hook: If Sarvam Realtime STT is enabled, stream chunk directly
              if (streamContext.sarvamClient && typeof streamContext.sarvamClient.sendAudioChunk === 'function') {
                streamContext.sarvamClient.sendAudioChunk(payload);
              }
            }

            // Log heartbeat periodically every ~200 chunks (~4 seconds of audio)
            if (audioChunkCount % 200 === 0) {
              console.log(`[VoiceStream] Live audio stream active: Stream ${currentStreamSid?.slice(0, 8)}... (${audioChunkCount} chunks processed)`);
            }

            break;
          }

          case 'stop': {
            console.log(`[VoiceStream] Twilio stream stopped: Stream ${currentStreamSid}`);
            this._cleanupStream(currentStreamSid, currentSessionId);
            break;
          }

          case 'mark': {
            console.log(`[VoiceStream] Playback mark event: ${data.mark?.name}`);
            break;
          }

          default:
            break;
        }

      } catch (err) {
        console.error('[VoiceStream] Error processing WebSocket message:', err.message);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[VoiceStream] WebSocket closed for Stream ${currentStreamSid || 'unknown'} (Code: ${code})`);
      this._cleanupStream(currentStreamSid, currentSessionId);
    });

    ws.on('error', (err) => {
      console.error(`[VoiceStream] WebSocket error on Stream ${currentStreamSid || 'unknown'}:`, err.message);
      this._cleanupStream(currentStreamSid, currentSessionId);
    });
  }

  async _cleanupStream(streamSid, sessionId) {
    if (streamSid && activeStreams.has(streamSid)) {
      const context = activeStreams.get(streamSid);
      if (context.sarvamClient && typeof context.sarvamClient.close === 'function') {
        try {
          context.sarvamClient.close();
        } catch {}
      }
      activeStreams.delete(streamSid);
    }

    if (sessionId) {
      await twilioVoiceService.updateSession(sessionId, {
        status: 'completed',
        endedAt: new Date()
      });
      console.log(`[VoiceSession] Session ${sessionId} marked as completed.`);
    }
  }

  /**
   * Helper to send audio payload back to the user's phone via Twilio Media Stream
   */
  sendAudioToCall(streamSid, base64MulawAudio) {
    const context = activeStreams.get(streamSid);
    if (!context || !context.ws || context.ws.readyState !== 1) {
      return false;
    }

    try {
      const mediaMessage = JSON.stringify({
        event: 'media',
        streamSid,
        media: {
          payload: base64MulawAudio
        }
      });
      context.ws.send(mediaMessage);
      return true;
    } catch (err) {
      console.error(`[VoiceStream] Failed to send audio to stream ${streamSid}:`, err.message);
      return false;
    }
  }
}

export const voiceStreamService = new VoiceStreamService();
