/**
 * Enterprise Sarvam Speech-to-Text (STT) & Audio Ingestion Service
 * 
 * Capabilities:
 * 1. Secure download of Twilio Call Recordings with Basic Auth and exponential backoff retry.
 * 2. Real audio transcription via Sarvam AI STT API (saaras:v3 / saaras:v2).
 * 3. Native support for Indian languages (Gujarati, Hindi, English, and multilingual mixed speech).
 * 4. Speaker/turn & timestamp preservation where available.
 * 5. Complete transcript extraction without premature translation or truncation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', '..', '..', 'uploads');

export class SarvamSttService {
  constructor() {
    this.name = 'sarvam-stt-service';
    this.sarvamApiKey = process.env.SARVAM_API_KEY || null;
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || null;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || null;

    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch {}
    }
  }

  /**
   * Securely downloads Twilio call recording audio with controlled retries
   */
  async downloadTwilioRecording(recordingUrl, options = {}) {
    const { maxRetries = 3, initialDelayMs = 1500 } = options;
    const accountSid = this.twilioAccountSid;
    const authToken = this.twilioAuthToken;

    if (!recordingUrl) {
      throw new Error('Twilio recording URL is required.');
    }

    // Standardize URL to .wav or .mp3
    let targetUrl = recordingUrl;
    if (!targetUrl.endsWith('.wav') && !targetUrl.endsWith('.mp3')) {
      targetUrl = `${targetUrl}.wav`;
    }

    const authHeader = accountSid && authToken
      ? `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
      : null;

    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        console.log(`[SarvamSTT] Downloading Twilio recording (Attempt ${attempt}/${maxRetries}): ${targetUrl}`);

        const headers = {};
        if (authHeader) {
          headers['Authorization'] = authHeader;
        }

        const res = await fetch(targetUrl, {
          method: 'GET',
          headers: headers
        });

        if (!res.ok) {
          throw new Error(`Twilio recording download failed with HTTP ${res.status}: ${res.statusText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 100) {
          throw new Error(`Recording audio file is too small or empty (${buffer.length} bytes).`);
        }

        const contentType = res.headers.get('content-type') || 'audio/wav';
        console.log(`[SarvamSTT] Successfully downloaded recording audio: ${buffer.length} bytes (${contentType})`);

        return {
          buffer,
          contentType,
          sizeBytes: buffer.length,
          url: targetUrl
        };
      } catch (err) {
        lastError = err;
        console.warn(`[SarvamSTT] Recording download attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          const delay = initialDelayMs * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw new Error(`Failed to download Twilio recording after ${maxRetries} attempts: ${lastError?.message || 'Network error'}`);
  }

  /**
   * Transcribes audio buffer using Sarvam AI Speech-to-Text API
   */
  async transcribeAudioBuffer({ audioBuffer, filename = 'recording.wav', languageCode = 'unknown', model = 'saaras:v3' }) {
    const apiKey = this.sarvamApiKey || process.env.SARVAM_API_KEY;

    if (!apiKey) {
      console.warn('[SarvamSTT] SARVAM_API_KEY is not configured in environment.');
      throw new Error('Sarvam API key is missing. Please set SARVAM_API_KEY in backend environment.');
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty. Cannot transcribe.');
    }

    const maxRetries = 3;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        console.log(`[SarvamSTT] Calling Sarvam STT API (Attempt ${attempt}/${maxRetries}, size: ${audioBuffer.length} bytes, model: ${model})...`);

        // Construct standard multipart/form-data
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        formData.append('file', blob, filename);
        formData.append('model', model);
        if (languageCode && languageCode !== 'auto') {
          formData.append('language_code', languageCode);
        }

        const startTime = Date.now();
        const res = await fetch('https://api.sarvam.ai/speech-to-text', {
          method: 'POST',
          headers: {
            'api-subscription-key': apiKey
          },
          body: formData
        });

        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          const errorBody = await res.text().catch(() => '');
          throw new Error(`Sarvam STT API returned HTTP ${res.status}: ${errorBody || res.statusText}`);
        }

        const data = await res.json();
        const transcript = data.transcript || data.text || '';
        const detectedLanguage = data.language_code || data.detected_language_code || languageCode || 'en-IN';
        const confidence = data.confidence || 1.0;
        const timestamps = data.timestamps || data.segments || null;

        console.log(`[SarvamSTT] Transcription succeeded in ${durationMs}ms: Detected Lang: ${detectedLanguage}, Length: ${transcript.length} chars`);

        return {
          success: true,
          transcript: transcript.trim(),
          detectedLanguage,
          confidence,
          timestamps,
          provider: 'sarvam',
          model,
          processingDurationMs: durationMs,
          rawResponse: data
        };
      } catch (err) {
        lastError = err;
        console.warn(`[SarvamSTT] Transcription attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
    }

    throw new Error(`Sarvam STT failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Complete high-level method: Downloads recording from Twilio & transcribes via Sarvam
   */
  async processTwilioRecording({ recordingUrl, recordingSid, sessionId = null, languageHint = 'unknown' }) {
    console.log(`[SarvamSTT] Processing recording: ${recordingSid || 'N/A'} for session ${sessionId || 'N/A'}`);

    // 1. Download audio
    const audioData = await this.downloadTwilioRecording(recordingUrl);

    // Optionally persist audio file to uploads for debugging/archival
    const audioFilename = `recording-${recordingSid || sessionId || Date.now()}.wav`;
    const audioFilePath = path.join(uploadsDir, audioFilename);
    try {
      fs.writeFileSync(audioFilePath, audioData.buffer);
    } catch {}

    // 2. Call Sarvam STT
    const sttResult = await this.transcribeAudioBuffer({
      audioBuffer: audioData.buffer,
      filename: audioFilename,
      languageCode: languageHint
    });

    return {
      recordingSid,
      audioFilePath,
      audioSizeBytes: audioData.sizeBytes,
      ...sttResult
    };
  }
}

export const sarvamSttService = new SarvamSttService();
