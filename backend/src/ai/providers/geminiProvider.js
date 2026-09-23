/**
 * Native Google Gemini Provider Adapter
 * Implements native Google Generative Language v1beta API protocol.
 * Features:
 * - Centralized configuration via geminiConfig
 * - Native system_instruction and contents payload structure
 * - Clean x-goog-api-key header authentication (supports both AQ. and AIza keys)
 * - Native responseMimeType: "application/json" for guaranteed JSON output
 * - Structured token usage normalization
 * - Comprehensive error classification taxonomy (AUTH_ERROR, INVALID_API_KEY, MODEL_NOT_FOUND, RATE_LIMIT, TIMEOUT, NETWORK_ERROR, PROVIDER_UNAVAILABLE)
 * - Safe model fallbacks using validated Google models (gemini-2.0-flash, gemini-1.5-flash)
 * - Zero secrets in logs or responses
 */

import { geminiConfig } from '../config/geminiConfig.js';

export class GeminiProvider {
  constructor() {
    this.name = 'gemini';
  }

  /**
   * Sanitized internal logger that strictly deletes any authorization tokens or headers.
   */
  _log(level, message, meta = {}) {
    const safeMeta = { ...meta };
    delete safeMeta.apiKey;
    delete safeMeta.headers;
    delete safeMeta.key;
    const logPayload = `[Gemini Provider] ${message} ${Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : ''}`;
    if (level === 'error') {
      console.error(logPayload);
    } else if (level === 'warn') {
      console.warn(logPayload);
    } else {
      console.log(logPayload);
    }
  }

  /**
   * Classifies HTTP and network errors into standard error taxonomy (Requirement 19).
   * 
   * @param {number} status
   * @param {string} [errorBody]
   * @param {Error} [originalError]
   * @returns {Error}
   */
  _classifyError(status, errorBody = '', originalError = null) {
    let code = 'PROVIDER_ERROR';
    const bodyStr = typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody || '');
    const lowerBody = bodyStr.toLowerCase();
    let message = bodyStr || originalError?.message || 'Gemini API call failed';

    const isApiKeyInvalid =
      lowerBody.includes('api key not valid') ||
      lowerBody.includes('api_key_invalid') ||
      lowerBody.includes('invalid api key');

    const isAuthError =
      status === 401 ||
      status === 403 ||
      lowerBody.includes('access_token_type_unsupported') ||
      lowerBody.includes('unauthenticated') ||
      lowerBody.includes('invalid authentication credentials') ||
      lowerBody.includes('permission denied');

    const isModelNotFound =
      status === 404 ||
      lowerBody.includes('not found') ||
      lowerBody.includes('is not found for api version') ||
      lowerBody.includes('models/');

    if (isApiKeyInvalid) {
      code = 'INVALID_API_KEY';
      message = 'Google Gemini API key is invalid. Verify AI_API_KEY in backend/.env.';
    } else if (isAuthError) {
      code = 'AUTH_ERROR';
      message = 'Google Gemini API authentication failed. Verify AI_API_KEY in backend/.env.';
    } else if (isModelNotFound) {
      code = 'MODEL_NOT_FOUND';
      message = `Requested Gemini model is not found or unsupported: ${message.slice(0, 200)}`;
    } else if (status === 429) {
      code = 'RATE_LIMIT';
      message = 'Google Gemini rate limit exceeded. Please back off and retry.';
    } else if (status === 503) {
      code = 'RATE_LIMIT';
      message = 'Google Gemini model is experiencing high demand. Please try again.';
    } else if (status === 500 || status === 502 || status === 504) {
      code = 'PROVIDER_UNAVAILABLE';
      message = `Google Gemini service is temporarily unavailable (HTTP ${status}).`;
    } else if (originalError?.name === 'AbortError') {
      code = 'TIMEOUT';
      message = 'Google Gemini request timed out.';
    } else if (
      originalError?.code === 'ECONNRESET' ||
      originalError?.code === 'ENOTFOUND' ||
      originalError?.message?.includes('fetch failed')
    ) {
      code = 'NETWORK_ERROR';
      message = `Network connectivity error reaching Google Gemini API: ${originalError.message}`;
    } else if (status === 400) {
      code = 'CONFIG_ERROR';
      message = `Google Gemini configuration error: ${message.slice(0, 300)}`;
    }

    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.provider = 'gemini';
    return error;
  }

  /**
   * Executes a native Gemini generateContent call with timeout and candidate model retry.
   * 
   * @param {object} params
   * @param {string} [params.apiKey]
   * @param {string} [params.model]
   * @param {string} [params.systemPrompt]
   * @param {string} params.userPrompt
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @param {number} [params.timeoutMs]
   * @returns {Promise<{ text: string, provider: string, model: string, usage: object, finishReason: string, rawMetadata: object }>}
   */
  async generateChatCompletion({
    apiKey: explicitKey,
    model: requestedModel,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    timeoutMs
  }) {
    const apiKey = typeof explicitKey === 'string' ? explicitKey : geminiConfig.getApiKey();

    if (!apiKey) {
      const err = new Error('Google Gemini API key is missing. Verify AI_API_KEY environment variable in backend/.env.');
      err.code = 'KEY_MISSING';
      err.provider = 'gemini';
      throw err;
    }

    const effectiveModel = geminiConfig.getModel(requestedModel);
    const candidateModels = geminiConfig.getCandidateModels(effectiveModel);
    const effectiveTemp = typeof temperature === 'number' ? temperature : geminiConfig.getTemperature();
    const effectiveMaxTokens = typeof maxTokens === 'number' ? maxTokens : geminiConfig.getMaxTokens();
    const effectiveTimeout = Math.min(typeof timeoutMs === 'number' ? timeoutMs : geminiConfig.getTimeoutMs(), 12000);

    let lastError = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i];
      const maxRetries = 1;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

        // Native Google v1beta endpoint using x-goog-api-key header
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`;

        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: effectiveTemp,
            maxOutputTokens: effectiveMaxTokens
          }
        };

        if (systemPrompt && systemPrompt.trim()) {
          requestBody.system_instruction = {
            parts: [{ text: systemPrompt }]
          };
        }

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let parsedError = null;
            try {
              parsedError = JSON.parse(errorText)?.error;
            } catch {}

            const classifiedErr = this._classifyError(
              response.status,
              parsedError?.message || errorText,
              null
            );
            classifiedErr.model = currentModel;

            // Authentication or Invalid Key errors must fail fast without wasteful retries
            if (classifiedErr.code === 'AUTH_ERROR' || classifiedErr.code === 'INVALID_API_KEY') {
              throw classifiedErr;
            }

            // If 503 or 429 (transient capacity or rate limit), retry with backoff on same model
            if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
              const backoffMs = (attempt + 1) * 1000;
              this._log('warn', `Model ${currentModel} returned HTTP ${response.status} (${classifiedErr.code}). Retrying in ${backoffMs}ms...`);
              await new Promise(r => setTimeout(r, backoffMs));
              lastError = classifiedErr;
              continue;
            }

            // If 404 (model not found), advance immediately to next candidate model
            if (classifiedErr.code === 'MODEL_NOT_FOUND' && i < candidateModels.length - 1) {
              this._log('warn', `Model ${currentModel} not found (${classifiedErr.code}). Switching to candidate ${candidateModels[i + 1]}...`);
              lastError = classifiedErr;
              break;
            }

            // If 503 or 429 and retries exhausted, try next candidate
            if ((response.status === 503 || response.status === 429) && i < candidateModels.length - 1) {
              this._log('warn', `Model ${currentModel} exhausted retries. Switching to candidate ${candidateModels[i + 1]}...`);
              lastError = classifiedErr;
              break;
            }

            throw classifiedErr;
          }

          const data = await response.json();
          const candidate = data.candidates?.[0];
          const rawText = candidate?.content?.parts?.[0]?.text || '';
          const finishReason = candidate?.finishReason || 'STOP';
          const usageMeta = data.usageMetadata || {};

          const normalizedUsage = {
            promptTokens: usageMeta.promptTokenCount || 0,
            completionTokens: usageMeta.candidatesTokenCount || 0,
            totalTokens: usageMeta.totalTokenCount || (usageMeta.promptTokenCount || 0) + (usageMeta.candidatesTokenCount || 0)
          };

          if (!rawText || !rawText.trim()) {
            const emptyErr = new Error(`Gemini model ${currentModel} returned an empty response. Finish reason: ${finishReason}`);
            emptyErr.code = 'INVALID_RESPONSE';
            emptyErr.provider = 'gemini';
            emptyErr.model = currentModel;
            throw emptyErr;
          }

          return {
            text: rawText.trim(),
            provider: 'gemini',
            model: currentModel,
            usage: normalizedUsage,
            finishReason,
            rawMetadata: {
              serviceTier: usageMeta.serviceTier || 'standard',
              modelVersion: data.modelVersion || currentModel
            }
          };

        } catch (err) {
          clearTimeout(timeoutId);

          if (err.name === 'AbortError' || controller.signal.aborted) {
            const timeoutErr = new Error(`Google Gemini API call timed out after ${effectiveTimeout}ms.`);
            timeoutErr.code = 'TIMEOUT';
            timeoutErr.provider = 'gemini';
            timeoutErr.model = currentModel;

            if (i < candidateModels.length - 1) {
              this._log('warn', `Model ${currentModel} timed out. Switching to candidate ${candidateModels[i + 1]}...`);
              lastError = timeoutErr;
              break;
            }

            throw timeoutErr;
          }

          if (err.code && err.provider === 'gemini') {
            throw err;
          }

          const classified = this._classifyError(err.status || 0, null, err);
          classified.model = currentModel;

          if (classified.code === 'AUTH_ERROR' || classified.code === 'INVALID_API_KEY') {
            throw classified;
          }

          if (classified.code === 'NETWORK_ERROR' && i < candidateModels.length - 1) {
            lastError = classified;
            break;
          }

          throw classified;
        }
      }
    }

    throw lastError || new Error('Google Gemini API candidate models exhausted.');
  }

  /**
   * Lightweight non-destructive ping for provider health checks.
   * Safe for diagnostic endpoint and startup verifications.
   * 
   * @param {object} [params]
   * @param {string} [params.apiKey]
   * @param {string} [params.model]
   * @param {number} [params.timeoutMs]
   * @returns {Promise<{ provider: string, model: string, configured: boolean, reachable: boolean, authenticated: boolean, latencyMs: number, status: string, errorCategory?: string, errorMessage?: string }>}
   */
  async ping(params = {}) {
    const apiKey = params.apiKey || geminiConfig.getApiKey();
    const model = geminiConfig.getModel(params.model);
    const timeoutMs = params.timeoutMs || 8000;
    const startTime = Date.now();

    if (!apiKey) {
      return {
        provider: 'gemini',
        model,
        configured: false,
        authenticated: false,
        reachable: false,
        latencyMs: 0,
        status: 'KEY_MISSING',
        errorCategory: 'KEY_MISSING',
        errorMessage: 'AI_API_KEY environment variable is not configured in backend/.env',
        lastChecked: new Date().toISOString()
      };
    }

    try {
      const result = await this.generateChatCompletion({
        apiKey,
        model,
        userPrompt: 'Respond with JSON: {"status": "ok", "health": "healthy"}',
        temperature: 0.1,
        maxTokens: 64,
        timeoutMs
      });

      return {
        provider: 'gemini',
        model: result.model,
        configured: true,
        authenticated: true,
        reachable: true,
        latencyMs: Date.now() - startTime,
        status: 'HEALTHY',
        lastChecked: new Date().toISOString()
      };
    } catch (err) {
      const isAuth = err.code === 'AUTH_ERROR' || err.code === 'INVALID_API_KEY';
      return {
        provider: 'gemini',
        model,
        configured: true,
        authenticated: false,
        reachable: !isAuth && err.code !== 'NETWORK_ERROR',
        latencyMs: Date.now() - startTime,
        status: isAuth ? 'AUTH_ERROR' : (err.code || 'UNHEALTHY'),
        errorCategory: err.code || 'PROVIDER_ERROR',
        errorMessage: err.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

export const geminiProvider = new GeminiProvider();
