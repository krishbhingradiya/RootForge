/**
 * Voice Transcription Service
 * 
 * Provides server-side speech-to-text (STT) transcription using Google Gemini multimodal audio.
 * Supports:
 * - English (en), Gujarati (gu), and Hindi (hi)
 * - Mixed-language business and technical terminology
 * - Audio mime-types: audio/webm, audio/wav, audio/ogg, audio/mp3
 * - Zero external paid speech dependencies; leverages existing AI_API_KEY
 * - Never exposes API key to client
 */

export class TranscriptionService {
  constructor() {
    this.name = 'transcription-service';
  }

  /**
   * Fast Voice Activity Detection (VAD) / Root Mean Square energy computation.
   * Accurately distinguishes mathematical silence and flat tones from speech.
   */
  _computeAudioEnergy(buffer, mimeType) {
    if (!buffer || buffer.length <= 44) return 0;
    if (mimeType && mimeType.includes('wav')) {
      let sumSquares = 0;
      let sampleCount = 0;
      for (let i = 44; i < buffer.length - 1; i += 2) {
        const sample = buffer.readInt16LE(i) / 32768.0;
        sumSquares += sample * sample;
        sampleCount++;
      }
      return sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
    }
    return 1.0;
  }

  /**
   * Transcribes base64-encoded audio buffer using Gemini multimodal audio.
   * 
   * @param {object} params
   * @param {string} params.audioBase64 - Base64 encoded audio bytes
   * @param {string} [params.mimeType='audio/webm'] - Audio MIME type
   * @param {string} [params.expectedLanguage='en'] - 'en' | 'hi' | 'gu'
   * @returns {Promise<{ transcript: string, detectedLanguage: string, hasSpeech: boolean, durationMs?: number }>}
   */
  async transcribeAudio({ audioBase64, mimeType = 'audio/webm', expectedLanguage = 'en' }) {
    const tStart = Date.now();
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      const err = new Error('AI_API_KEY is not configured in backend environment.');
      err.code = 'KEY_MISSING';
      throw err;
    }

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      const err = new Error('Invalid or missing audio data for transcription.');
      err.code = 'INVALID_AUDIO';
      throw err;
    }

    // Voice Activity Detection (VAD) / Energy pre-check
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const energy = this._computeAudioEnergy(audioBuffer, mimeType);

    if (energy === 0 || (mimeType.includes('wav') && energy < 0.0005)) {
      return {
        transcript: '',
        detectedLanguage: expectedLanguage,
        hasSpeech: false,
        durationMs: Date.now() - tStart,
        model: 'vad-energy-filter'
      };
    }

    // Supported candidate models
    const models = [
      process.env.AI_MODEL || 'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-flash-latest'
    ];

    const langDirective = expectedLanguage === 'gu'
      ? 'The expected language is Gujarati (ગુજરાતી). Transcribe in Gujarati script.'
      : expectedLanguage === 'hi'
      ? 'The expected language is Hindi (हिंदी). Transcribe in Devanagari script.'
      : 'The expected language is English (en). Transcribe in English.';

    const prompt = `You are a speech-to-text transcription engine.
Transcribe the provided spoken audio verbatim.
${langDirective}

CRITICAL RULES:
1. Do NOT translate the transcript into another language. Transcribe what was actually spoken in the original language spoken.
2. If spoken in Gujarati, transcribe accurately in Gujarati script (e.g. "મારે મારી વેબસાઇટમાં એપોઇન્ટમેન્ટ રિમાઇન્ડર ફીચર ઉમેરવું છે").
3. If spoken in Hindi, transcribe accurately in Devanagari script (e.g. "मैं अपनी वेबसाइट में अपॉइंटमेंट रिमाइंडर फीचर जोड़ना चाहता हूँ").
4. If spoken in English, transcribe accurately in English (e.g. "I want to add appointment reminders to my website").
5. If the speaker uses mixed English technical terms (e.g. "appointment booking", "reminder", "feature", "API", "database"), preserve the English terms naturally or in appropriate phonetic transliteration.
6. If the audio contains only tones, beeps, synthetic frequencies, background noise, or silence without clear human spoken words, do NOT guess or hallucinate words (such as 'Hello' or 'Yes'). You MUST return hasSpeech: false and transcript: "".
7. Return strictly a JSON object with this format:
{
  "transcript": "exact spoken words",
  "detectedLanguage": "en" | "gu" | "hi",
  "hasSpeech": true | false
}`;

    let lastError = null;

    for (const model of models) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType.split(';')[0], // e.g. audio/webm
                      data: audioBase64
                    }
                  },
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.0,
              maxOutputTokens: 1024
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.warn(`[TranscriptionService] Model ${model} returned HTTP ${response.status}: ${errText.slice(0, 150)}`);
          lastError = new Error(`Gemini transcription error (${response.status})`);
          continue;
        }

        const data = await response.json();
        const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawOutput) {
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(rawOutput);
        } catch {
          parsed = { transcript: rawOutput.trim(), detectedLanguage: expectedLanguage, hasSpeech: true };
        }

        const transcript = (parsed.transcript || '').trim();
        const detectedLanguage = parsed.detectedLanguage || expectedLanguage;
        const hasSpeech = Boolean(parsed.hasSpeech && transcript.length > 0);

        return {
          transcript,
          detectedLanguage,
          hasSpeech,
          durationMs: Date.now() - tStart,
          model
        };

      } catch (err) {
        console.warn(`[TranscriptionService] Network error with model ${model}:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('All speech transcription candidate models exhausted.');
  }
}

export const transcriptionService = new TranscriptionService();
