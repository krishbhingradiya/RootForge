/**
 * Prompts Registry
 * Central catalog of prompt builders and versions across the 8-stage transformation pipeline.
 */

import {
  PROMPT_VERSION as ANALYSIS_PROMPT_VERSION,
  buildBusinessAnalysisPrompt
} from './user/analyzeBusinessContext.prompt.js';
import {
  PROMPT_VERSION as SOLUTIONS_PROMPT_VERSION,
  buildSolutionsPrompt
} from './user/recommendSolutions.prompt.js';
import {
  PROMPT_VERSION as ARCHITECTURE_PROMPT_VERSION,
  buildArchitecturePrompt
} from './user/generateArchitecture.prompt.js';
import {
  PROMPT_VERSION as PROCESS_PROMPT_VERSION,
  buildProcessPrompt
} from './user/generateProcess.prompt.js';
import {
  PROMPT_VERSION as UX_PROMPT_VERSION,
  buildUXPrompt
} from './user/generateUX.prompt.js';
import {
  PROMPT_VERSION as DATABASE_PROMPT_VERSION,
  buildDatabasePrompt
} from './user/generateDatabase.prompt.js';
import {
  PROMPT_VERSION as API_PROMPT_VERSION,
  buildAPIPrompt
} from './user/generateAPIs.prompt.js';
import {
  PROMPT_VERSION as PLANNING_PROMPT_VERSION,
  buildPlanningPrompt
} from './user/generateImplementationPlan.prompt.js';

export const PROMPT_VERSIONS = {
  ANALYSIS: ANALYSIS_PROMPT_VERSION,
  SOLUTIONS: SOLUTIONS_PROMPT_VERSION,
  ARCHITECTURE: ARCHITECTURE_PROMPT_VERSION,
  PROCESS: PROCESS_PROMPT_VERSION,
  UX: UX_PROMPT_VERSION,
  DATABASE: DATABASE_PROMPT_VERSION,
  API: API_PROMPT_VERSION,
  PLANNING: PLANNING_PROMPT_VERSION
};

export const promptRegistry = {
  getAnalysisPrompt(context) {
    return buildBusinessAnalysisPrompt(context);
  },
  getSolutionsPrompt(context, businessAnalysis) {
    return buildSolutionsPrompt(context, businessAnalysis);
  },
  getArchitecturePrompt(context, solution) {
    return buildArchitecturePrompt(context, solution);
  },
  getProcessPrompt(context, solution, architecture) {
    return buildProcessPrompt(context, solution, architecture);
  },
  getUXPrompt(context, solution, architecture, processModel) {
    return buildUXPrompt(context, solution, architecture, processModel);
  },
  getDatabasePrompt(context, solution, architecture, processModel) {
    return buildDatabasePrompt(context, solution, architecture, processModel);
  },
  getAPIPrompt(context, solution, architecture, processModel, databaseDesign) {
    return buildAPIPrompt(context, solution, architecture, processModel, databaseDesign);
  },
  getPlanningPrompt(context, solution, architecture, processModel, uxDesign, databaseDesign, apiDesign) {
    return buildPlanningPrompt(context, solution, architecture, processModel, uxDesign, databaseDesign, apiDesign);
  }
};


