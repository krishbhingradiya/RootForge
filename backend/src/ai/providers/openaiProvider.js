/**
 * Native OpenAI Provider Adapter
 * Implements native OpenAI Chat Completions API protocol (/v1/chat/completions).
 * Features:
 * - Bearer token authentication
 * - response_format: { type: "json_object" }
 * - Normalized token usage and telemetry
 * - Explicit error classification (AUTH_ERROR, RATE_LIMIT, TIMEOUT, CONFIG_ERROR, NETWORK_ERROR)
 */

export class OpenAiProvider {
  constructor() {
    this.name = 'openai';
  }

  _log(level, message, meta = {}) {
    const safeMeta = { ...meta };
    delete safeMeta.apiKey;
    delete safeMeta.headers;
    const logPayload = `[OpenAI Provider] ${message} ${Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : ''}`;
    if (level === 'error') {
      console.error(logPayload);
    } else if (level === 'warn') {
      console.warn(logPayload);
    } else {
      console.log(logPayload);
    }
  }

  _classifyError(status, errorBody, originalError) {
    let code = 'PROVIDER_ERROR';
    let message = errorBody || originalError?.message || 'OpenAI API call failed';

    if (status === 401 || status === 403) {
      code = 'AUTH_ERROR';
      message = 'OpenAI API authentication failed. Verify AI_API_KEY.';
    } else if (status === 429) {
      code = 'RATE_LIMIT';
      message = 'OpenAI API rate limit or quota exceeded.';
    } else if (status === 400 || status === 404) {
      code = 'CONFIG_ERROR';
      message = `OpenAI API configuration error: ${errorBody?.slice(0, 300) || status}`;
    } else if (originalError?.name === 'AbortError') {
      code = 'TIMEOUT';
      message = 'OpenAI API request timed out.';
    } else if (originalError?.code === 'ECONNRESET' || originalError?.code === 'ENOTFOUND' || originalError?.message?.includes('fetch failed')) {
      code = 'NETWORK_ERROR';
      message = `Network connectivity error reaching OpenAI API: ${originalError.message}`;
    }

    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.provider = 'openai';
    return error;
  }

  /**
   * Executes an OpenAI chat completion with JSON mode and timeout.
   */
  async generateChatCompletion({
    apiKey,
    model = 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature = 0.3,
    maxTokens = 4096,
    timeoutMs = 45000
  }) {
    if (!apiKey) {
      const err = new Error('OpenAI API key is missing. Verify AI_API_KEY environment variable.');
      err.code = 'CONFIG_ERROR';
      err.provider = 'openai';
      throw err;
    }

    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const messages = [];
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
          temperature: typeof temperature === 'number' ? temperature : 0.3,
          max_tokens: typeof maxTokens === 'number' ? maxTokens : 4096,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let parsedError = null;
        try {
          parsedError = JSON.parse(errorText)?.error;
        } catch {}

        throw this._classifyError(response.status, parsedError?.message || errorText, null);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const rawText = choice?.message?.content || '';
      const finishReason = choice?.finish_reason || 'stop';
      const usage = data.usage || {};

      if (!rawText || !rawText.trim()) {
        const emptyErr = new Error(`OpenAI model ${model} returned an empty response.`);
        emptyErr.code = 'INVALID_RESPONSE';
        emptyErr.provider = 'openai';
        throw emptyErr;
      }

      return {
        text: rawText.trim(),
        provider: 'openai',
        model: data.model || model,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        finishReason,
        rawMetadata: {
          id: data.id,
          created: data.created
        }
      };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError' || controller.signal.aborted) {
        const timeoutErr = new Error(`OpenAI API call timed out after ${timeoutMs}ms.`);
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.provider = 'openai';
        throw timeoutErr;
      }

      if (err.code && err.provider === 'openai') {
        throw err;
      }

      throw this._classifyError(err.status || 0, null, err);
    }
  }

  /**
   * Lightweight non-destructive ping for provider health checks.
   */
  async ping({ apiKey, model = 'gpt-4o-mini', timeoutMs = 8000 }) {
    const startTime = Date.now();
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
        provider: 'openai',
        model: result.model,
        configured: true,
        reachable: true,
        latencyMs: Date.now() - startTime,
        status: 'HEALTHY',
        lastChecked: new Date().toISOString()
      };
    } catch (err) {
      return {
        provider: 'openai',
        model,
        configured: !!apiKey,
        reachable: false,
        latencyMs: Date.now() - startTime,
        status: 'UNHEALTHY',
        errorCategory: err.code || 'PROVIDER_ERROR',
        errorMessage: err.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

export const openAiProvider = new OpenAiProvider();
