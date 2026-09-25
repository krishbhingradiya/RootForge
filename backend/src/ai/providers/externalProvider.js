/**
 * Unified Multi-Stage External AI Provider Pipeline
 * Coordinates prompt formulation, provider routing (Gemini / OpenAI),
 * safe JSON parsing, schema validation, bounded repair retry, and telemetry.
 * 
 * Supports all 8 downstream generation stages:
 * - Stage 2: Business Analysis
 * - Stage 3: Solution Options
 * - Stage 4: Target Architecture
 * - Stage 5: Process Intelligence
 * - Stage 6: UX Wireframes & Studio
 * - Stage 7: Relational Database
 * - Stage 8: REST API Blueprint
 * - Stage 8: Implementation Planning
 */

import { providerRouter } from './providerRouter.js';
import { geminiConfig } from '../config/geminiConfig.js';
import {
  buildBusinessAnalysisPrompt,
  PROMPT_VERSION as ANALYSIS_PROMPT_VERSION
} from '../prompts/user/analyzeBusinessContext.prompt.js';
import {
  buildSolutionsPrompt,
  PROMPT_VERSION as SOLUTIONS_PROMPT_VERSION
} from '../prompts/user/recommendSolutions.prompt.js';
import {
  buildArchitecturePrompt,
  PROMPT_VERSION as ARCHITECTURE_PROMPT_VERSION
} from '../prompts/user/generateArchitecture.prompt.js';
import {
  buildProcessPrompt,
  PROMPT_VERSION as PROCESS_PROMPT_VERSION
} from '../prompts/user/generateProcess.prompt.js';
import {
  buildUXPrompt,
  PROMPT_VERSION as UX_PROMPT_VERSION
} from '../prompts/user/generateUX.prompt.js';
import {
  buildUXPatchPrompt
} from '../prompts/user/interpretUXCommand.prompt.js';
import {
  buildDatabasePrompt,
  PROMPT_VERSION as DATABASE_PROMPT_VERSION
} from '../prompts/user/generateDatabase.prompt.js';
import {
  buildAPIPrompt,
  PROMPT_VERSION as API_PROMPT_VERSION
} from '../prompts/user/generateAPIs.prompt.js';
import {
  buildPlanningPrompt,
  PROMPT_VERSION as PLANNING_PROMPT_VERSION
} from '../prompts/user/generateImplementationPlan.prompt.js';
import {
  buildDiscoveryQuestionsPrompt,
  PROMPT_VERSION as DISCOVERY_PROMPT_VERSION
} from '../prompts/user/generateDiscovery.prompt.js';
import {
  safeParseJson,
  validateDiscoveryQuestions,
  validateBusinessAnalysis,
  validateSolution,
  validateArchitecture,
  validateProcess,
  validateUX,
  validateUXPatch,
  validateDatabase,
  validateAPI,
  validatePlanning
} from '../schemaValidator.js';

export class ExternalAiProvider {
  get name() {
    return providerRouter.getConfiguredProviderName().toUpperCase();
  }

  /**
   * Safe generation logger that protects credentials and respects AI_LOG_PROMPTS.
   */
  _log(level, message, meta = {}) {
    const safeMeta = { ...meta };
    delete safeMeta.apiKey;
    delete safeMeta.headers;

    const logPayload = `[External AI Provider] ${message} ${Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : ''}`;
    if (level === 'error') {
      console.error(logPayload);
    } else if (level === 'warn') {
      console.warn(logPayload);
    } else {
      console.log(logPayload);
    }
  }

  /**
   * Legacy backward-compatibility method for direct chat completion calls.
   */
  async _callChatCompletion({ apiKey, model, messages, temperature, maxTokens, timeoutMs }) {
    const systemMsg = messages?.find(m => m.role === 'system')?.content || '';
    const userMsg = messages?.find(m => m.role === 'user')?.content || '';

    return await providerRouter.generateChatCompletion({
      apiKey: apiKey || process.env.AI_API_KEY,
      model: model || process.env.AI_MODEL,
      systemPrompt: systemMsg,
      userPrompt: userMsg,
      temperature,
      maxTokens,
      timeoutMs
    });
  }

  /**
   * Core orchestrator executing a stage prompt against the active provider with JSON validation and retry.
   */
  async _executeStagePipeline({
    stageName,
    workspaceId,
    promptBuilderResult,
    schemaValidator
  }) {
    const startTime = Date.now();
    const configuredProvider = providerRouter.getConfiguredProviderName();
    const apiKey = configuredProvider === 'gemini' ? geminiConfig.getApiKey() : process.env.AI_API_KEY;

    if (!apiKey) {
      const err = new Error(`External AI requested for ${stageName} but AI_API_KEY is not configured.`);
      err.code = 'KEY_MISSING';
      throw err;
    }

    const model = configuredProvider === 'gemini' ? geminiConfig.getModel() : (process.env.AI_MODEL || 'gpt-4o-mini');
    const temperature = parseFloat(process.env.AI_TEMPERATURE || '0.3');
    const maxTokens = parseInt(process.env.AI_MAX_TOKENS || '4096', 10);
    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '45000', 10);
    const logPrompts = process.env.AI_LOG_PROMPTS === 'true';

    const { systemPrompt, userPrompt, promptVersion } = promptBuilderResult;

    if (logPrompts) {
      this._log('info', `Executing prompt for ${stageName}`, {
        workspaceId,
        provider: configuredProvider,
        model,
        promptVersion,
        userPromptSnippet: userPrompt.slice(0, 300)
      });
    }

    let currentUserPrompt = userPrompt;
    let lastRawOutput = '';
    let totalTokensUsed = 0;
    let attempt = 0;
    const maxAttempts = 2; // initial attempt + 1 repair retry
    let lastLlmResponse = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        lastLlmResponse = await providerRouter.generateChatCompletion({
          apiKey,
          model,
          systemPrompt,
          userPrompt: currentUserPrompt,
          temperature,
          maxTokens,
          timeoutMs
        });

        const usage = lastLlmResponse.usage || {};
        totalTokensUsed += usage.totalTokens || 0;
        lastRawOutput = lastLlmResponse.text || '';

        // Safe JSON Parse
        const parsed = safeParseJson(lastRawOutput);
        if (!parsed.success) {
          const parseErr = new Error(parsed.error);
          parseErr.code = 'PARSE_ERROR';
          parseErr.rawOutput = lastRawOutput;
          throw parseErr;
        }

        // Schema Validation
        const validated = schemaValidator(parsed.data);
        if (!validated.valid) {
          const valErr = new Error(`${stageName} schema validation failed: ${validated.errors.join('; ')}`);
          valErr.code = 'SCHEMA_VALIDATION_FAILED';
          valErr.errors = validated.errors;
          valErr.rawOutput = lastRawOutput;
          throw valErr;
        }

        this._log('info', `${stageName} generated successfully`, {
          workspaceId,
          provider: lastLlmResponse.provider,
          model: lastLlmResponse.model,
          latencyMs: Date.now() - startTime,
          totalTokensUsed,
          attempts: attempt
        });

        return {
          result: parsed.data,
          _meta: {
            provider: lastLlmResponse.provider.toUpperCase(),
            model: lastLlmResponse.model,
            latencyMs: Date.now() - startTime,
            tokensUsed: totalTokensUsed,
            attempts: attempt,
            promptVersion
          }
        };

      } catch (err) {
        // If timeout, network, config, or auth error, do not perform repair retry
        if (
          err.code === 'TIMEOUT' ||
          err.code === 'AUTH_ERROR' ||
          err.code === 'RATE_LIMIT' ||
          err.code === 'KEY_MISSING' ||
          err.code === 'CONFIG_ERROR' ||
          err.code === 'NETWORK_ERROR'
        ) {
          throw err;
        }

        if (attempt < maxAttempts) {
          this._log('warn', `${stageName} generation attempt ${attempt} failed, retrying once`, {
            workspaceId,
            reason: err.code || 'UNKNOWN_ERROR',
            details: err.message
          });

          currentUserPrompt = `${userPrompt}\n\nCRITICAL FIX: Your previous response failed schema validation with: ${err.message}. Return ONLY a single valid JSON object strictly adhering to the schema.`;
          continue;
        }

        // Exhausted attempts
        err.tokensUsed = totalTokensUsed;
        err.model = model;
        throw err;
      }
    }
  }

  // =========================================================================
  // STAGE 1: DISCOVERY QUESTIONS
  // =========================================================================
  async generateDiscoveryQuestions(context) {
    const workspaceId = context?.workspace?.id || 'unknown';
    const response = await this._executeStagePipeline({
      stageName: 'Discovery Questions',
      workspaceId,
      promptBuilderResult: buildDiscoveryQuestionsPrompt(context),
      schemaValidator: validateDiscoveryQuestions
    });

    const res = response.result;
    if (res && Array.isArray(res.questions)) {
      return res.questions;
    }
    if (Array.isArray(res)) {
      return res;
    }
    return [];
  }

  // =========================================================================
  // STAGE 2: BUSINESS ANALYSIS
  // =========================================================================
  async generateBusinessAnalysis(context) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'Business Analysis',
      workspaceId,
      promptBuilderResult: buildBusinessAnalysisPrompt(context),
      schemaValidator: validateBusinessAnalysis
    });
  }

  // =========================================================================
  // STAGE 3: SOLUTION OPTIONS
  // =========================================================================
  async generateSolutions(context, businessAnalysis) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'Solution Options',
      workspaceId,
      promptBuilderResult: buildSolutionsPrompt(context, businessAnalysis),
      schemaValidator: validateSolution
    });
  }

  // =========================================================================
  // STAGE 4: TARGET ARCHITECTURE
  // =========================================================================
  async generateArchitecture(context, solution) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'Target Architecture',
      workspaceId,
      promptBuilderResult: buildArchitecturePrompt(context, solution),
      schemaValidator: validateArchitecture
    });
  }

  // =========================================================================
  // STAGE 5: PROCESS INTELLIGENCE
  // =========================================================================
  async generateProcess(context, solution, architecture) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'Process Intelligence',
      workspaceId,
      promptBuilderResult: buildProcessPrompt(context, solution, architecture),
      schemaValidator: validateProcess
    });
  }

  // =========================================================================
  // STAGE 6: UX WIREFRAMES & DYNAMIC COMMAND INTERPRETER
  // =========================================================================
  async generateUX(context, solution, architecture, processModel, options = {}) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'UX Wireframes',
      workspaceId,
      promptBuilderResult: buildUXPrompt(context, solution, architecture, processModel, options),
      schemaValidator: validateUX
    });
  }

  async interpretUXCommand(context, currentSpec, command, businessDomain = 'GENERAL_ENTERPRISE') {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'UX Command Interpretation',
      workspaceId,
      promptBuilderResult: buildUXPatchPrompt(currentSpec, command, businessDomain),
      schemaValidator: validateUXPatch
    });
  }

  // =========================================================================
  // STAGE 7: RELATIONAL DATABASE
  // =========================================================================
  async generateDatabase(context, solution, architecture, processModel) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'Relational Database',
      workspaceId,
      promptBuilderResult: buildDatabasePrompt(context, solution, architecture, processModel),
      schemaValidator: validateDatabase
    });
  }

  // =========================================================================
  // STAGE 8A: REST APIS
  // =========================================================================
  async generateAPIs(context, solution, architecture, processModel, databaseDesign) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'REST API Blueprint',
      workspaceId,
      promptBuilderResult: buildAPIPrompt(context, solution, architecture, processModel, databaseDesign),
      schemaValidator: validateAPI
    });
  }

  // =========================================================================
  // STAGE 8B: IMPLEMENTATION PLANNING
  // =========================================================================
  async generateImplementationPlan(
    context,
    solution,
    architecture,
    processModel,
    databaseDesign,
    apiEndpoints,
    wireframes
  ) {
    const workspaceId = context?.workspace?.id || 'unknown';
    return await this._executeStagePipeline({
      stageName: 'Implementation Plan',
      workspaceId,
      promptBuilderResult: buildPlanningPrompt(
        context,
        solution,
        architecture,
        processModel,
        databaseDesign,
        apiEndpoints,
        wireframes
      ),
      schemaValidator: validatePlanning
    });
  }
}

export const externalProvider = new ExternalAiProvider();
