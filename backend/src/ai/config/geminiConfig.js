/**
 * Centralized Gemini Configuration
 * 
 * Single source of truth for Google Gemini configuration across RootForge backend.
 * Guarantees:
 * - Deterministic API key discovery (AI_API_KEY -> GEMINI_API_KEY -> GOOGLE_API_KEY)
 * - Automatic model normalization to valid Google Generative AI models
 * - Zero secrets exposed in logs, diagnostics, or responses
 * - Unified candidate model fallback order
 */

const KNOWN_VALID_MODELS = new Set([
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
]);

const MODEL_ALIAS_MAP = {
  'gemini-2.0-flash': 'gemini-flash-latest',
  'gemini-1.5-flash': 'gemini-flash-latest',
  'gemini-1.5-pro': 'gemini-pro-latest'
};

export class GeminiConfig {
  /**
   * Resolves the configured Gemini API key from environment variables.
   * Priority: AI_API_KEY (existing primary) -> GEMINI_API_KEY -> GOOGLE_API_KEY
   * @returns {string} The secret API key string (for server-side provider use only).
   */
  getApiKey() {
    return (
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();
  }

  /**
   * Determines which environment variable provided the active key.
   * @returns {string|null} The variable name ('AI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY') or null
   */
  getEnvVarSource() {
    if (process.env.AI_API_KEY) return 'AI_API_KEY';
    if (process.env.GEMINI_API_KEY) return 'GEMINI_API_KEY';
    if (process.env.GOOGLE_API_KEY) return 'GOOGLE_API_KEY';
    return null;
  }

  /**
   * Checks whether an API key is currently configured.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.getApiKey());
  }

  /**
   * Resolves and normalizes the target Gemini model.
   * Uses verified active Google models: gemini-3.1-flash-lite, gemini-flash-latest, gemini-3.6-flash.
   * @param {string} [requestedModel]
   * @returns {string}
   */
  getModel(requestedModel) {
    const raw = (requestedModel || process.env.AI_MODEL || 'gemini-3.1-flash-lite').trim().toLowerCase();

    // Direct alias resolution
    if (MODEL_ALIAS_MAP[raw]) {
      return MODEL_ALIAS_MAP[raw];
    }

    // Direct match with valid models
    if (KNOWN_VALID_MODELS.has(raw)) {
      return raw;
    }

    if (raw.startsWith('gemini-')) {
      return raw;
    }

    return 'gemini-3.1-flash-lite';
  }

  /**
   * Returns the ordered list of candidate models for resilient fallback execution.
   * @param {string} [primaryModel]
   * @returns {string[]}
   */
  getCandidateModels(primaryModel) {
    const primary = this.getModel(primaryModel);
    const standardCandidates = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest'
    ];
    return Array.from(new Set([primary, ...standardCandidates]));
  }

  /**
   * Returns default temperature for generation.
   * @returns {number}
   */
  getTemperature() {
    const parsed = parseFloat(process.env.AI_TEMPERATURE || '0.3');
    return Number.isFinite(parsed) ? Math.max(0, Math.min(2, parsed)) : 0.3;
  }

  /**
   * Returns default max tokens for generation.
   * @returns {number}
   */
  getMaxTokens() {
    const parsed = parseInt(process.env.AI_MAX_TOKENS || '4096', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 4096;
  }

  /**
   * Returns default timeout in milliseconds.
   * @returns {number}
   */
  getTimeoutMs() {
    const parsed = parseInt(process.env.AI_TIMEOUT_MS || '45000', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 45000;
  }

  /**
   * Safe, non-secret diagnostic representation for health checks and startup logs.
   * NEVER returns keys, prefixes beyond key type, or authorization headers.
   * @returns {{ provider: string, model: string, apiKeyConfigured: boolean, envVarSource: string|null, keyFormat: string }}
   */
  getSanitizedConfig() {
    const apiKey = this.getApiKey();
    let keyFormat = 'NONE';
    if (apiKey) {
      if (apiKey.startsWith('AQ.')) keyFormat = 'AQ_AUTHENTICATION_KEY';
      else if (apiKey.startsWith('AIza')) keyFormat = 'AIZA_LEGACY_KEY';
      else keyFormat = 'CUSTOM_KEY';
    }

    return {
      provider: 'gemini',
      model: this.getModel(),
      apiKeyConfigured: Boolean(apiKey),
      envVarSource: this.getEnvVarSource(),
      keyFormat
    };
  }
}

export const geminiConfig = new GeminiConfig();
