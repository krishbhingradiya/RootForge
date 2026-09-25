/**
 * AI UX Command Interpretation Prompt Builder
 * Version: interpretUX_v1.0
 * 
 * Guides Gemini to translate natural language user UI requests into
 * machine-executable, structured UI JSON patches without arbitrary DOM/HTML manipulation.
 */

export const PROMPT_VERSION = 'interpretUX_v1.0';

/**
 * Builds the system and user prompt for Gemini to interpret a UX modification command.
 * 
 * @param {object} currentSpec Current UiSpecification
 * @param {string} command User's natural language command
 * @param {string} [businessDomain] Domain context (e.g. HEALTHCARE, LOGISTICS, FINANCE)
 * @returns {{ systemPrompt: string, userPrompt: string, promptVersion: string }}
 */
export function buildUXPatchPrompt(currentSpec, command, businessDomain = 'GENERAL_ENTERPRISE') {
  const systemPrompt = `You are the RootForge AI UX Designer and UI Patch Interpreter.
Your job is to interpret user commands and return a strictly structured JSON UI patch.

RULES:
1. Respond ONLY with valid JSON. Do not include markdown fences, thoughts, or conversational preambles.
2. DO NOT generate arbitrary raw HTML or CSS strings.
3. Target components semantically by type (e.g. 'kpi_grid', 'data_table', 'ai_copilot_panel', 'chart', 'search_filter_bar', 'workflow_tracker', 'kanban_board', 'activity_feed') or by id.
4. If the user asks for color/theme changes:
   - Always maintain high contrast and readability between background, surface/card, text, and buttons.
   - For light mode: background should be bright (#FFFFFF or #F8FAFC or #FDF8F0), text dark (#0F172A), cards white/light.
   - For dark mode: background dark (#0B0F19 or #05080F), text light (#FFFFFF or #F8FAFC), cards dark.
   - For named color themes (pink, purple, cyan, emerald, gold, amber, blue, etc.), provide coherent primary, buttonPrimary, accent, and cardBg/surface colors.
5. If the user requests multiple changes (compound command), return all operations inside the 'operations' array.
6. If the command is to move a component (e.g. 'Move AI assistant to the right', 'Put assistant below chart'), use operation: 'move' with position ('right_sidebar', 'left_sidebar', 'below', 'top', 'bottom').
7. If the command is to make the layout more minimal / compact, use operation: 'updateLayout' with density: 'compact', gap: 8, radius: '4px'.
8. If the command is to remove something, use operation: 'removeComponent' with target component type or id.

ALLOWED OPERATIONS:
- updateTheme: { operation: 'updateTheme', themeId?: string, mode?: 'dark'|'light', primaryColor?: string, accentColor?: string, buttonColor?: string, cardBg?: string, background?: string, border?: string, radius?: string, fontFamily?: string }
- updateLayout: { operation: 'updateLayout', density?: 'compact'|'comfortable'|'spacious', layoutType?: string, columns?: number, gap?: number, sidebarPosition?: 'left'|'right' }
- move: { operation: 'move', target: string, position: 'left_sidebar'|'right_sidebar'|'top'|'bottom'|'below', targetRegion?: string }
- addComponent: { operation: 'addComponent', position?: 'top'|'start'|'end'|'bottom', component: { id?: string, type: string, title: string, props?: object } }
- removeComponent: { operation: 'removeComponent', target: string }
- updateComponent: { operation: 'updateComponent', target: string, updates: { title?: string, props?: object } }

OUTPUT JSON SCHEMA:
{
  "version": "1.0",
  "operation": "patch",
  "summary": "Brief 1-sentence description of the changes",
  "operations": [
    {
      "operation": "updateTheme" | "updateLayout" | "move" | "addComponent" | "removeComponent" | "updateComponent",
      ...
    }
  ]
}`;

  const compInventory = (currentSpec?.components || []).map(c => ({
    id: c.id,
    type: c.type,
    title: c.title
  }));

  const userPrompt = `=== CURRENT UI SPECIFICATION ===
- Page: "${currentSpec?.page?.name || 'Workspace'}" (${businessDomain})
- Active Theme: mode=${currentSpec?.theme?.mode || 'dark'}, primary=${currentSpec?.theme?.primary || '#2563EB'}, cardBg=${currentSpec?.theme?.cardBg || '#111827'}, background=${currentSpec?.theme?.background || '#0B0F19'}
- Layout: density=${currentSpec?.layout?.density || 'comfortable'}, sidebarPosition=${currentSpec?.layout?.sidebarPosition || 'right'}
- Component Inventory:
${JSON.stringify(compInventory, null, 2)}

=== USER COMMAND ===
"${command}"

Convert this command into the structured JSON UI patch now.`;

  return {
    systemPrompt,
    userPrompt,
    promptVersion: PROMPT_VERSION
  };
}
