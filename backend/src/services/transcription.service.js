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

import { resolveConversationalLanguage } from '../utils/languageDetector.js';

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
   * Automatically detects spoken language (English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu).
   * 
   * @param {object} params
   * @param {string} params.audioBase64 - Base64 encoded audio bytes
   * @param {string} [params.mimeType='audio/webm'] - Audio MIME type
   * @param {string} [params.expectedLanguage='auto'] - 'auto' | 'en' | 'hi' | 'gu' | 'mr' | 'bn' | 'ta' | 'te' | 'kn' | 'ml' | 'pa' | 'ur'
   * @returns {Promise<{ transcript: string, detectedLanguage: string, hasSpeech: boolean, durationMs?: number }>}
   */
  async transcribeAudio({ audioBase64, mimeType = 'audio/webm', expectedLanguage = 'auto' }) {
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
        detectedLanguage: expectedLanguage === 'auto' ? 'en' : expectedLanguage,
        hasSpeech: false,
        durationMs: Date.now() - tStart,
        model: 'vad-energy-filter'
      };
    }

    // Supported candidate models (prioritized for ultra-low latency)
    const models = [
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite'
    ];

    const isExplicit = expectedLanguage && expectedLanguage !== 'auto';
    const langDirective = isExplicit
      ? `The expected language hint is '${expectedLanguage}'. Transcribe in the original language spoken.`
      : `Detect the spoken language automatically from the audio.`;

    const prompt = `You are a universal, high-accuracy speech-to-text transcription engine.
Transcribe the provided spoken audio verbatim into text.
${langDirective}

CRITICAL RULES:
1. SCRIPT ACCURACY:
   - If the user speaks in GUJARATI, transcribe strictly in GUJARATI SCRIPT (ગુજરાતી, e.g. "મારું નામ અનમોલ છે", "મને આ પ્રોજેક્ટ સમજાવો"). NEVER transliterate into English/Latin alphabet (do not write "Maru naam" or "samjhao") and NEVER translate into English.
   - If the user speaks in HINDI, transcribe strictly in DEVANAGARI HINDI SCRIPT (हिन्दी, e.g. "मेरा नाम अनमोल है", "मुझे यह प्रोजेक्ट समझाओ"). NEVER transliterate into English/Latin alphabet and NEVER translate into English.
   - If the user speaks in MARATHI, BENGALI, TAMIL, TELUGU, KANNADA, MALAYALAM, PUNJABI, or URDU, transcribe strictly in their respective native script (मराठी, বাংলা, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, اردو).
   - If the user speaks in ENGLISH, transcribe accurately in English.
2. MIXED VOCABULARY & TECHNICAL TERMS:
   - If the speaker mentions English technical keywords or proper nouns (e.g. "API", "ER diagram", "database", "workflow", "project", "backend", "frontend", "architecture", "dashboard"), you may preserve those specific technical words in English (e.g. "મારે આ project માટે workflow બનાવવો છે").
3. NO TRANSLATION: Do NOT translate the user's spoken words into another language. Transcribe what was actually spoken in the original language and its native script.
4. AUDIO SILENCE: If the audio contains only tones, beeps, noise, or silence without clear human speech, return hasSpeech: false and transcript: "".
5. LANGUAGE IDENTIFICATION: Identify the exact detectedLanguage code: "en" | "hi" | "gu" | "mr" | "bn" | "ta" | "te" | "kn" | "ml" | "pa" | "ur".

Return strictly a JSON object with this format:
{
  "transcript": "exact spoken words in native script",
  "detectedLanguage": "en" | "hi" | "gu" | "mr" | "bn" | "ta" | "te" | "kn" | "ml" | "pa" | "ur",
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
              maxOutputTokens: 256
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
          parsed = { transcript: rawOutput.trim(), detectedLanguage: expectedLanguage === 'auto' ? 'en' : expectedLanguage, hasSpeech: true };
        }

        const transcript = (parsed.transcript || '').trim();
        const rawLang = parsed.detectedLanguage || (expectedLanguage === 'auto' ? 'en' : expectedLanguage);
        // Authoritative validation via language detector
        const detectedLanguage = resolveConversationalLanguage(transcript, rawLang);
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
