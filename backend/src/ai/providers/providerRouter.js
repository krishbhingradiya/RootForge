/**
 * AI Provider Router
 * Decoupled routing layer that directs AI generation requests to the explicitly configured provider.
 * Guarantees:
 * - Centralized Gemini configuration integration
 * - Gemini credentials are NEVER sent to OpenAI endpoints
 * - OpenAI credentials are NEVER sent to Gemini endpoints
 * - Strict error classification on invalid / unsupported configurations
 * - Transparent telemetry and health reporting
 */

import { geminiProvider } from './geminiProvider.js';
import { openAiProvider } from './openaiProvider.js';
import { demoProvider } from './demoProvider.js';
import { geminiConfig } from '../config/geminiConfig.js';

export class ProviderRouter {
  constructor() {}

  get providers() {
    return {
      gemini: geminiProvider,
      openai: openAiProvider,
      demo: demoProvider
    };
  }

  /**
   * Resolves the configured provider identifier cleanly (case-insensitive).
   */
  getConfiguredProviderName() {
    return (process.env.AI_PROVIDER || 'DEMO').toLowerCase().trim();
  }

  /**
   * Returns the active provider adapter or throws a typed CONFIG_ERROR.
   */
  getActiveProvider() {
    const providerName = this.getConfiguredProviderName();
    const providers = {
      gemini: geminiProvider,
      openai: openAiProvider,
      demo: demoProvider
    };
    const provider = providers[providerName];

    if (!provider) {
      const err = new Error(
        `Unsupported or unconfigured AI_PROVIDER "${process.env.AI_PROVIDER}". ` +
        `Supported providers in Phase 1: "gemini", "openai", "demo".`
      );
      err.code = 'CONFIG_ERROR';
      throw err;
    }

    return provider;
  }

  /**
   * Dispatches chat completion to the active native provider adapter.
   */
  async generateChatCompletion(params = {}) {
    const provider = this.getActiveProvider();
    const providerName = this.getConfiguredProviderName();

    if (providerName === 'demo') {
      const err = new Error('generateChatCompletion called directly on DEMO provider.');
      err.code = 'CONFIG_ERROR';
      throw err;
    }

    // Default key from centralized config if gemini
    if (providerName === 'gemini' && !params.apiKey) {
      params.apiKey = geminiConfig.getApiKey();
    }
    if (providerName === 'gemini' && !params.model) {
      params.model = geminiConfig.getModel();
    }

    return await provider.generateChatCompletion(params);
  }

  /**
   * Dispatches streaming chat completion to the active native provider adapter.
   */
  async streamChatCompletion(params = {}) {
    const provider = this.getActiveProvider();
    const providerName = this.getConfiguredProviderName();

    if (providerName === 'demo') {
      const err = new Error('streamChatCompletion called directly on DEMO provider.');
      err.code = 'CONFIG_ERROR';
      throw err;
    }

    if (providerName === 'gemini' && !params.apiKey) {
      params.apiKey = geminiConfig.getApiKey();
    }
    if (providerName === 'gemini' && !params.model) {
      params.model = geminiConfig.getModel();
    }

    if (typeof provider.streamChatCompletion === 'function') {
      return await provider.streamChatCompletion(params);
    }

    // Fallback if provider doesn't support streaming
    const res = await provider.generateChatCompletion(params);
    if (typeof params.onChunk === 'function' && res.text) {
      params.onChunk({ delta: res.text, accumulatedText: res.text });
    }
    return res;
  }

  /**
   * Dispatches non-destructive ping to test active provider connectivity.
   */
  async ping(params = {}) {
    const providerName = this.getConfiguredProviderName();
    const provider = this.providers[providerName];

    if (providerName === 'demo') {
      return {
        provider: 'demo',
        model: 'deterministic',
        configured: true,
        authenticated: true,
        reachable: true,
        latencyMs: 1,
        status: 'HEALTHY',
        note: 'Built-in deterministic demo engine active (zero external API calls).',
        lastChecked: new Date().toISOString()
      };
    }

    if (!provider) {
      return {
        provider: providerName,
        configured: false,
        authenticated: false,
        reachable: false,
        latencyMs: 0,
        status: 'CONFIG_ERROR',
        errorCategory: 'CONFIG_ERROR',
        errorMessage: `Unsupported AI_PROVIDER: "${process.env.AI_PROVIDER}"`,
        lastChecked: new Date().toISOString()
      };
    }

    const apiKey =
      params.apiKey ||
      (providerName === 'gemini' ? geminiConfig.getApiKey() : process.env.AI_API_KEY);

    const model =
      params.model ||
      (providerName === 'gemini' ? geminiConfig.getModel() : process.env.AI_MODEL);

    return await provider.ping({
      apiKey,
      model,
      timeoutMs: params.timeoutMs || 8000
    });
  }
}

export const providerRouter = new ProviderRouter();
