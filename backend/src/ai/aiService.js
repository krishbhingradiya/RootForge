/**
 * AI Service Orchestration Layer
 * Implements Strategy pattern between demoProvider and externalProvider.
 * 
 * Phase 4 Rules:
 * - Stage 2 (analyzeBusinessContext): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_ANALYSIS=true.
 * - Stage 3 (recommendSolutions): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_SOLUTIONS=true.
 * - Stage 4 (generateArchitecture): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_ARCHITECTURE=true.
 * - Stage 5 (generateProcess): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_PROCESS=true.
 * - Stage 6 (generateUX): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_UX=true.
 * - Stage 7 (generateDatabase): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_DATABASE=true.
 * - Stage 8 (generateAPIs): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_API=true.
 * - Stage 8 (generateImplementationPlan): Eligible for Real AI when AI_PROVIDER != 'DEMO' and AI_ENABLE_STAGE_PLANNING=true.
 * - Stage 1 (Discovery): Strictly utilizes demoProvider.
 */

import { demoProvider } from './providers/demoProvider.js';
import { externalProvider } from './providers/externalProvider.js';
import { providerRouter } from './providers/providerRouter.js';
import { relevanceGuard } from './relevanceGuard.js';
import { geminiConfig } from './config/geminiConfig.js';
import { PROMPT_VERSION as ANALYSIS_PROMPT_VERSION } from './prompts/user/analyzeBusinessContext.prompt.js';
import { PROMPT_VERSION as SOLUTIONS_PROMPT_VERSION } from './prompts/user/recommendSolutions.prompt.js';
import { PROMPT_VERSION as ARCHITECTURE_PROMPT_VERSION } from './prompts/user/generateArchitecture.prompt.js';
import { PROMPT_VERSION as PROCESS_PROMPT_VERSION } from './prompts/user/generateProcess.prompt.js';
import { PROMPT_VERSION as UX_PROMPT_VERSION } from './prompts/user/generateUX.prompt.js';
import { PROMPT_VERSION as DATABASE_PROMPT_VERSION } from './prompts/user/generateDatabase.prompt.js';
import { PROMPT_VERSION as API_PROMPT_VERSION } from './prompts/user/generateAPIs.prompt.js';
import { PROMPT_VERSION as PLANNING_PROMPT_VERSION } from './prompts/user/generateImplementationPlan.prompt.js';

export class AiService {
  constructor() {
    this.checkConfigurationOnStartup();
  }

  /**
   * Safe startup check. Logs a warning if external AI is requested without an API key.
   */
  checkConfigurationOnStartup() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const hasKey = !!process.env.AI_API_KEY;
    const analysisEnabled = process.env.AI_ENABLE_STAGE_ANALYSIS === 'true';
    const solutionsEnabled = process.env.AI_ENABLE_STAGE_SOLUTIONS === 'true';
    const architectureEnabled = process.env.AI_ENABLE_STAGE_ARCHITECTURE === 'true';
    const processEnabled = process.env.AI_ENABLE_STAGE_PROCESS === 'true';
    const uxEnabled = process.env.AI_ENABLE_STAGE_UX === 'true';
    const databaseEnabled = process.env.AI_ENABLE_STAGE_DATABASE === 'true';
    const apiEnabled = process.env.AI_ENABLE_STAGE_API === 'true';
    const planningEnabled = process.env.AI_ENABLE_STAGE_PLANNING === 'true';

    const hasAnyRealStage = analysisEnabled || solutionsEnabled || architectureEnabled || processEnabled || uxEnabled || databaseEnabled || apiEnabled || planningEnabled;

    if (provider !== 'DEMO' && hasAnyRealStage && !hasKey) {
      console.warn(
        `[AI Service] WARNING: AI_PROVIDER is set to "${provider}" with active stage flags ` +
        `(analysis=${analysisEnabled}, solutions=${solutionsEnabled}, architecture=${architectureEnabled}, ` +
        `process=${processEnabled}, ux=${uxEnabled}, database=${databaseEnabled}, api=${apiEnabled}, planning=${planningEnabled}), ` +
        `but AI_API_KEY is not set. Requests will automatically fall back to demoProvider.`
      );
    }
  }

  /**
   * Returns safe provider configuration telemetry without leaking secrets.
   */
  getProviderStatus() {
    const provider = (process.env.AI_PROVIDER || 'DEMO').toLowerCase();
    const apiKey = provider === 'gemini' ? geminiConfig.getApiKey() : process.env.AI_API_KEY;
    const isExternalConfigured = Boolean(apiKey) && provider !== 'demo';
    const stageAnalysisEnabled = process.env.AI_ENABLE_STAGE_ANALYSIS === 'true';
    const stageSolutionsEnabled = process.env.AI_ENABLE_STAGE_SOLUTIONS === 'true';
    const stageArchitectureEnabled = process.env.AI_ENABLE_STAGE_ARCHITECTURE === 'true';
    const stageProcessEnabled = process.env.AI_ENABLE_STAGE_PROCESS === 'true';
    const stageUXEnabled = process.env.AI_ENABLE_STAGE_UX === 'true';
    const stageDatabaseEnabled = process.env.AI_ENABLE_STAGE_DATABASE === 'true';
    const stageApiEnabled = process.env.AI_ENABLE_STAGE_API === 'true';
    const stagePlanningEnabled = process.env.AI_ENABLE_STAGE_PLANNING === 'true';
    const model = provider === 'gemini' ? geminiConfig.getModel() : (process.env.AI_MODEL || 'gpt-4o-mini');

    return {
      provider,
      externalConfigured: isExternalConfigured,
      stageAnalysisEnabled,
      stageSolutionsEnabled,
      stageArchitectureEnabled,
      stageProcessEnabled,
      stageUXEnabled,
      stageDatabaseEnabled,
      stageApiEnabled,
      stagePlanningEnabled,
      model: isExternalConfigured ? model : 'deterministic'
    };
  }

  /**
   * Performs an active, non-destructive health check ping on the configured AI provider.
   */
  async checkHealth(params = {}) {
    return await providerRouter.ping(params);
  }

  /**
   * Helper to check if external AI is configured and enabled for stage analysis.
   */
  isExternalAnalysisEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_ANALYSIS === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  /**
   * Helper to check if external AI is configured and enabled for solution options generation.
   */
  isExternalSolutionsEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_SOLUTIONS === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  /**
   * Helper to check if external AI is configured and enabled for architecture generation.
   */
  isExternalArchitectureEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_ARCHITECTURE === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  /**
   * Helper to check if external AI is configured and enabled for process generation.
   */
  isExternalProcessEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_PROCESS === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  /**
   * Helper to check if external AI is configured and enabled for UX generation.
   */
  isExternalUXEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_UX === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  /**
   * Helper to check if external AI is configured and enabled for Database generation.
   */
  isExternalDatabaseEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_DATABASE === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  /**
   * Helper to check if external AI is configured and enabled for API generation.
   */
  isExternalAPIEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_API === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  /**
   * Helper to check if external AI is configured and enabled for Planning generation.
   */
  isExternalPlanningEnabled() {
    const provider = process.env.AI_PROVIDER || 'DEMO';
    const stageEnabled = process.env.AI_ENABLE_STAGE_PLANNING === 'true';
    return provider !== 'DEMO' && stageEnabled;
  }

  // =========================================================================
  // STAGE 2: BUSINESS ANALYSIS (Real AI eligible)
  // =========================================================================
  async analyzeBusinessContext(context) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalAnalysisEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateBusinessAnalysis(context);
        return {
          ...response.result,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External analysis failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.analyzeBusinessContext(context);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: ANALYSIS_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.analyzeBusinessContext(context);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: ANALYSIS_PROMPT_VERSION
      }
    };
  }

  // =========================================================================
  // STAGE 3: SOLUTION OPTIONS (Real AI eligible in Phase 3B)
  // =========================================================================
  async recommendSolutions(context, analysis) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalSolutionsEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateSolutions(context, analysis);
        return {
          ...response.result,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External solutions failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.recommendSolutions(context, analysis);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: SOLUTIONS_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.recommendSolutions(context, analysis);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: SOLUTIONS_PROMPT_VERSION
      }
    };
  }

  // =========================================================================
  // STAGE 1: DISCOVERY & RELEVANCE GUARD
  // =========================================================================
  async generateDiscoveryQuestions(context) {
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const provider = (process.env.AI_PROVIDER || 'DEMO').toLowerCase();
    const hasKey = provider === 'gemini' ? geminiConfig.isConfigured() : Boolean(process.env.AI_API_KEY);

    if (provider !== 'demo' && hasKey) {
      try {
        return await externalProvider.generateDiscoveryQuestions(context);
      } catch (err) {
        console.warn(
          `[AI Service] External discovery question generation failed: ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );
        if (!fallbackOnError) {
          throw err;
        }
        return await demoProvider.generateDiscoveryQuestions(context);
      }
    }
    return await demoProvider.generateDiscoveryQuestions(context);
  }

  async classifyDiscoveryRelevance(context, userMessage, conversationHistory = []) {
    return await relevanceGuard.classify(context, userMessage, conversationHistory);
  }

  async answerDiscoveryQuestion(context, userMessage, conversationHistory = [], language = 'en') {
    // STAGE 1: Relevance classification guard
    const relevance = await relevanceGuard.classify(context, userMessage, conversationHistory);

    // If OFF_TOPIC: Return safe fixed business-context response in requested language
    if (relevance.classification === 'OFF_TOPIC') {
      return {
        message: relevanceGuard.getOffTopicResponse(context.workspace, language),
        suggestedAction: null,
        relevance
      };
    }

    // If CLARIFICATION: Return business-contextual clarification inquiry in requested language
    if (relevance.classification === 'CLARIFICATION') {
      return {
        message: relevanceGuard.getClarificationResponse(context, userMessage, language),
        suggestedAction: 'Clarify Scope',
        relevance
      };
    }

    // STAGE 2: If RELATED: Generate dynamic workspace consultant answer in requested language
    const answer = await relevanceGuard.generateConsultantAnswer(context, userMessage, conversationHistory, language);
    return {
      ...answer,
      relevance
    };
  }

  // =========================================================================
  // STAGE 4: TARGET ARCHITECTURE (Real AI eligible in Phase 3C)
  // =========================================================================
  async generateArchitecture(context, solution) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalArchitectureEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateArchitecture(context, solution);
        return {
          ...response.result,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External architecture failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.generateArchitecture(context, solution);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: ARCHITECTURE_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.generateArchitecture(context, solution);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: ARCHITECTURE_PROMPT_VERSION
      }
    };
  }

  // =========================================================================
  // STAGE 5: PROCESS MODEL (Real AI eligible in Phase 3C)
  // =========================================================================
  async generateProcess(context, solution) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalProcessEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateProcess(context, solution, context?.architecture);
        return {
          ...response.result,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External process failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.generateProcess(context, solution);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: PROCESS_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.generateProcess(context, solution);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: PROCESS_PROMPT_VERSION
      }
    };
  }

  // =========================================================================
  // STAGE 6: UX DESIGN (Real AI eligible in Phase 3D)
  // =========================================================================
  async generateUX(context, solution, options = {}) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalUXEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateUX(
          context,
          solution,
          context?.architecture,
          context?.process,
          options
        );
        const extResult = response.result;
        const screens = (extResult.screens || []).map((s, sIdx) => ({
          ...s,
          stats: s.stats || [
            { label: 'Screen Telemetry Rate', value: '99.4%', change: '+12% efficiency', trend: 'up', icon: 'ShieldCheck' },
            { label: 'Active Work Queue', value: '42 items', change: '-18% turnaround', trend: 'down', icon: 'Inbox' },
            { label: 'Automation Confidence', value: '94.8%', change: 'High compliance', trend: 'up', icon: 'Bot' }
          ],
          components: (s.components && s.components.length > 0) ? s.components : [
            {
              id: `cmp-${s.id}-1`,
              type: 'metrics_bar',
              title: 'Operational Telemetry Metrics',
              metrics: [
                { label: 'Active Throughput', value: '1,420 ops/hr' },
                { label: 'Exception Rate', value: '0.4%' },
                { label: 'Mean Resolution SLA', value: '1.8 min' }
              ]
            },
            {
              id: `cmp-${s.id}-2`,
              type: sIdx % 2 === 0 ? 'data_table' : 'form_editor',
              title: sIdx % 2 === 0 ? 'Live Operational Triage Grid' : 'Configuration & Workflow Inspector',
              badge: 'Live Sync',
              actionLabel: 'Execute Resolution',
              columns: ['Entity ID', 'Status', 'Risk Score', 'Assigned Actor', 'Action']
            },
            {
              id: `cmp-${s.id}-3`,
              type: 'ai_copilot_card',
              title: 'AI Decision Copilot Recommendations',
              recommendation: 'Autonomous rule validation detected high confidence match. Ready for single-click execution.',
              confidence: 96,
              actionLabel: 'Accept Copilot Plan'
            }
          ]
        }));
        const themeId = options?.selectedTheme || 'enterprise-slate';
        const userJourney = (extResult.userJourney && extResult.userJourney.length > 0) ? extResult.userJourney : screens.map((s, idx) => ({
          id: `uj-${idx + 1}`,
          screenId: s.id,
          stepName: s.name,
          actor: 'Operations User',
          action: `Interacts with ${s.name} to view operational telemetry and execute workflows`,
          output: 'State updated'
        }));

        const rawReqs = (options?.understanding?.functionalRequirements || []).map((fr, idx) => ({
          id: `REQ-UX-${String(idx + 1).padStart(2, '0')}`,
          title: fr
        })).concat(context?.requirements || []);

        const requirementCoverage = (extResult.requirementCoverage && extResult.requirementCoverage.length > 0) ? extResult.requirementCoverage : (
          rawReqs.length > 0
            ? rawReqs.slice(0, 5).map((r, idx) => ({
                requirementId: r.id || `REQ-UX-${idx + 1}`,
                requirementTitle: r.title || r.description || `Requirement ${idx + 1}`,
                implementedScreenIds: [screens[idx % screens.length]?.id || screens[0]?.id],
                implementedComponents: [screens[idx % screens.length]?.name || 'Core View'],
                status: 'COVERED'
              }))
            : screens.map((s, idx) => ({
                requirementId: `REQ-UX-${String(idx + 1).padStart(2, '0')}`,
                requirementTitle: `Provide interface for ${s.name}`,
                implementedScreenIds: [s.id],
                implementedComponents: [s.name],
                status: 'COVERED'
              }))
        );

        const uxQualityCheck = extResult.uxQualityCheck || {
          requirementCoverage: 96,
          navigationConsistency: 100,
          responsiveReadiness: 94,
          accessibility: 92,
          summary: 'High-fidelity design specification meets enterprise usability criteria.'
        };

        const uxRecommendations = extResult.uxRecommendations || [
          {
            id: 'rec-1',
            title: 'Elevate Primary Action CTA Above the Fold',
            description: 'Positioning the primary action trigger in the top right header reduces mouse travel by 32%.',
            impact: 'HIGH',
            type: 'ERGONOMICS',
            applied: false
          },
          {
            id: 'rec-2',
            title: 'Add Quick Filter Chips to Data Tables',
            description: 'Provide 1-tap filtering for "Urgent" and "SLA Warning" to accelerate triage velocity.',
            impact: 'MEDIUM',
            type: 'PRODUCTIVITY',
            applied: true
          },
          {
            id: 'rec-3',
            title: 'Include Contextual Confirmation Toasts',
            description: 'Provide undo-capable confirmation feedback following automated dispatches.',
            impact: 'MEDIUM',
            type: 'ACCESSIBILITY',
            applied: true
          }
        ];

        const designExplanation = extResult.designExplanation || {
          rationale: `The generated UX layout provides comprehensive support for the ${extResult.title} workflow.`,
          layoutStrategy: 'Hierarchical navigation with high-visibility summary stats and rapid inline action tables.',
          ctaPlacement: 'Primary execution triggers are placed in high-visibility header and card footer locations.',
          mobileConsiderations: 'Tables automatically convert to vertical card stacks on mobile devices.'
        };

        return {
          ...extResult,
          screens,
          activeThemeId: themeId,
          userJourney,
          requirementCoverage,
          uxQualityCheck,
          uxRecommendations,
          designExplanation,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External UX failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.generateUX(context, solution, options);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: UX_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.generateUX(context, solution, options);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: UX_PROMPT_VERSION
      }
    };
  }

  async analyzeUXRequirement(context, requirementText) {
    const startTime = Date.now();
    const result = await demoProvider.analyzeUXRequirement(context, requirementText);
    return {
      ...result,
      _meta: {
        provider: 'DEMO',
        latencyMs: Date.now() - startTime,
        promptVersion: UX_PROMPT_VERSION
      }
    };
  }

  async editUXWithPrompt(context, currentUX, prompt, screenId, componentId) {
    const startTime = Date.now();
    const result = await demoProvider.editUXWithPrompt(context, currentUX, prompt, screenId, componentId);
    return {
      ...result,
      _meta: {
        provider: 'DEMO',
        latencyMs: Date.now() - startTime,
        promptVersion: UX_PROMPT_VERSION
      }
    };
  }

  // =========================================================================
  // STAGE 7: DATABASE DESIGN (Real AI eligible in Phase 3D)
  // =========================================================================
  async generateDatabase(context, solution) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalDatabaseEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateDatabase(
          context,
          solution,
          context?.architecture,
          context?.process
        );
        return {
          ...response.result,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External database failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.generateDatabase(context, solution);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: DATABASE_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.generateDatabase(context, solution);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: DATABASE_PROMPT_VERSION
      }
    };
  }

  // =========================================================================
  // STAGE 8: API SPECIFICATIONS (Real AI eligible in Phase 3D)
  // =========================================================================
  async generateAPIs(context, solution) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalAPIEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateAPIs(
          context,
          solution,
          context?.architecture,
          context?.process,
          context?.database
        );
        return {
          ...response.result,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External API failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.generateAPIs(context, solution);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: API_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.generateAPIs(context, solution);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: API_PROMPT_VERSION
      }
    };
  }

  // =========================================================================
  // STAGE 8: IMPLEMENTATION PLANNING (Real AI eligible in Phase 4)
  // =========================================================================
  async generateImplementationPlan(context, solution) {
    const startTime = Date.now();
    const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
    const isEligibleForExternal = this.isExternalPlanningEnabled();

    if (isEligibleForExternal) {
      try {
        if (!process.env.AI_API_KEY) {
          const keyMissingError = new Error('AI_API_KEY is not configured');
          keyMissingError.code = 'KEY_MISSING';
          throw keyMissingError;
        }

        const response = await externalProvider.generateImplementationPlan(
          context,
          solution,
          context?.architecture,
          context?.process,
          context?.ux,
          context?.database,
          context?.api
        );
        return {
          ...response.result,
          _meta: response._meta
        };

      } catch (err) {
        const fallbackReason = err.code || 'HTTP_ERROR';
        console.warn(
          `[AI Service] External Planning failed (${fallbackReason}): ${err.message}. ` +
          (fallbackOnError ? 'Falling back to demoProvider.' : 'Fallback disabled.')
        );

        if (!fallbackOnError) {
          throw err;
        }

        const demoResult = await demoProvider.generateImplementationPlan(context, solution);
        return {
          ...demoResult,
          _meta: {
            provider: 'DEMO_FALLBACK',
            originalProvider: process.env.AI_PROVIDER || 'UNKNOWN',
            model: err.model || 'deterministic',
            latencyMs: Date.now() - startTime,
            tokensUsed: err.tokensUsed || 0,
            fallbackReason,
            errorMessage: err.message,
            promptVersion: PLANNING_PROMPT_VERSION
          }
        };
      }
    }

    // Default: Baseline Demo Provider
    const demoResult = await demoProvider.generateImplementationPlan(context, solution);
    return {
      ...demoResult,
      _meta: {
        provider: 'DEMO',
        model: 'deterministic',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        fallbackReason: null,
        promptVersion: PLANNING_PROMPT_VERSION
      }
    };
  }
}

export const aiService = new AiService();
