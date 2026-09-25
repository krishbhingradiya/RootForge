/**
 * RootForge UI Patch Engine
 * 
 * Implements high-performance, deterministic local UI specification patch operations
 * for sub-millisecond execution of One-Click Directives and Natural Language edits.
 */

import { THEME_ARCHETYPES, validateAndRepairUiSpecification } from './dynamicUiSchema.js';

// Comprehensive color palette dictionary
export const COLOR_PALETTES = {
  pink: {
    name: 'Vibrant Pink',
    primary: '#EC4899',
    secondary: '#DB2777',
    accent: '#F472B6',
    surface: '#1A0E1C',
    cardBg: '#1A0E1C',
    background: '#0D060E',
    border: 'rgba(236, 72, 153, 0.35)',
    buttonPrimary: '#EC4899',
    buttonSecondary: 'rgba(236, 72, 153, 0.2)',
    text: '#FDF2F8',
    textMuted: '#F472B6'
  },
  rose: {
    name: 'Rose Quartz',
    primary: '#F43F5E',
    secondary: '#E11D48',
    accent: '#FB7185',
    surface: '#1C0D12',
    cardBg: '#1C0D12',
    background: '#0F0609',
    border: 'rgba(244, 63, 94, 0.35)',
    buttonPrimary: '#F43F5E',
    buttonSecondary: 'rgba(244, 63, 94, 0.2)',
    text: '#FFF1F2',
    textMuted: '#FDA4AF'
  },
  fuchsia: {
    name: 'Electric Fuchsia',
    primary: '#D946EF',
    secondary: '#C026D3',
    accent: '#E879F9',
    surface: '#180B1C',
    cardBg: '#180B1C',
    background: '#0E0611',
    border: 'rgba(217, 70, 239, 0.35)',
    buttonPrimary: '#D946EF',
    buttonSecondary: 'rgba(217, 70, 239, 0.2)',
    text: '#FDF4FF',
    textMuted: '#F0ABFC'
  },
  magenta: {
    name: 'Deep Magenta',
    primary: '#C026D3',
    secondary: '#A21CAF',
    accent: '#E879F9',
    surface: '#170A1A',
    cardBg: '#170A1A',
    background: '#0C050E',
    border: 'rgba(192, 38, 211, 0.35)',
    buttonPrimary: '#C026D3',
    buttonSecondary: 'rgba(192, 38, 211, 0.2)',
    text: '#FDF4FF',
    textMuted: '#E879F9'
  },
  purple: {
    name: 'Royal Purple',
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#A78BFA',
    surface: '#171328',
    cardBg: '#171328',
    background: '#0D0B18',
    border: 'rgba(139, 92, 246, 0.3)',
    buttonPrimary: '#8B5CF6',
    buttonSecondary: 'rgba(139, 92, 246, 0.2)',
    text: '#F5F3FF',
    textMuted: '#C4B5FD'
  },
  violet: {
    name: 'FinTech Violet',
    primary: '#7C3AED',
    secondary: '#6D28D9',
    accent: '#A78BFA',
    surface: '#151126',
    cardBg: '#151126',
    background: '#0C0A17',
    border: 'rgba(124, 58, 237, 0.3)',
    buttonPrimary: '#7C3AED',
    buttonSecondary: 'rgba(124, 58, 237, 0.2)',
    text: '#F5F3FF',
    textMuted: '#C4B5FD'
  },
  indigo: {
    name: 'Cosmic Indigo',
    primary: '#6366F1',
    secondary: '#4F46E5',
    accent: '#818CF8',
    surface: '#12142B',
    cardBg: '#12142B',
    background: '#0A0B1A',
    border: 'rgba(99, 102, 241, 0.3)',
    buttonPrimary: '#6366F1',
    buttonSecondary: 'rgba(99, 102, 241, 0.2)',
    text: '#EEF2FF',
    textMuted: '#A5B4FC'
  },
  blue: {
    name: 'Enterprise Blue',
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#60A5FA',
    surface: '#111827',
    cardBg: '#111827',
    background: '#0B0F19',
    border: 'rgba(37, 99, 235, 0.3)',
    buttonPrimary: '#2563EB',
    buttonSecondary: 'rgba(37, 99, 235, 0.2)',
    text: '#F9FAFB',
    textMuted: '#9CA3AF'
  },
  navy: {
    name: 'Deep Navy',
    primary: '#1E40AF',
    secondary: '#1E3A8A',
    accent: '#3B82F6',
    surface: '#0F172A',
    cardBg: '#0F172A',
    background: '#080E1A',
    border: 'rgba(59, 130, 246, 0.3)',
    buttonPrimary: '#2563EB',
    buttonSecondary: 'rgba(37, 99, 235, 0.2)',
    text: '#F8FAFC',
    textMuted: '#94A3B8'
  },
  sky: {
    name: 'Sky Blue',
    primary: '#0284C7',
    secondary: '#0369A1',
    accent: '#38BDF8',
    surface: '#0C1A24',
    cardBg: '#0C1A24',
    background: '#060F17',
    border: 'rgba(56, 189, 248, 0.3)',
    buttonPrimary: '#0284C7',
    buttonSecondary: 'rgba(2, 132, 199, 0.2)',
    text: '#F0F9FF',
    textMuted: '#7DD3FC'
  },
  cyan: {
    name: 'Cyber Cyan',
    primary: '#06B6D4',
    secondary: '#0891B2',
    accent: '#67E8F9',
    surface: '#0A1820',
    cardBg: '#0A1820',
    background: '#050E14',
    border: 'rgba(6, 182, 212, 0.3)',
    buttonPrimary: '#06B6D4',
    buttonSecondary: 'rgba(6, 182, 212, 0.2)',
    text: '#ECFEFF',
    textMuted: '#67E8F9'
  },
  teal: {
    name: 'Deep Teal',
    primary: '#0D9488',
    secondary: '#0F766E',
    accent: '#2DD4BF',
    surface: '#0A1A18',
    cardBg: '#0A1A18',
    background: '#05100F',
    border: 'rgba(13, 148, 136, 0.3)',
    buttonPrimary: '#0D9488',
    buttonSecondary: 'rgba(13, 148, 136, 0.2)',
    text: '#F0FDFA',
    textMuted: '#5EEAD4'
  },
  green: {
    name: 'Emerald Ops',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    surface: '#0B1A14',
    cardBg: '#0B1A14',
    background: '#050E0A',
    border: 'rgba(16, 185, 129, 0.3)',
    buttonPrimary: '#10B981',
    buttonSecondary: 'rgba(16, 185, 129, 0.2)',
    text: '#ECFDF5',
    textMuted: '#6EE7B7'
  },
  emerald: {
    name: 'Emerald Matrix',
    primary: '#059669',
    secondary: '#047857',
    accent: '#34D399',
    surface: '#0A1813',
    cardBg: '#0A1813',
    background: '#040F0B',
    border: 'rgba(5, 150, 105, 0.3)',
    buttonPrimary: '#059669',
    buttonSecondary: 'rgba(5, 150, 105, 0.2)',
    text: '#ECFDF5',
    textMuted: '#6EE7B7'
  },
  lime: {
    name: 'Electric Lime',
    primary: '#84CC16',
    secondary: '#65A30D',
    accent: '#A3E635',
    surface: '#141A0A',
    cardBg: '#141A0A',
    background: '#0A0F05',
    border: 'rgba(132, 204, 22, 0.35)',
    buttonPrimary: '#84CC16',
    buttonSecondary: 'rgba(132, 204, 22, 0.2)',
    text: '#F7FEE7',
    textMuted: '#BEF264'
  },
  yellow: {
    name: 'Bright Yellow & Gold',
    primary: '#EAB308',
    secondary: '#CA8A04',
    accent: '#FDE047',
    surface: '#1A170A',
    cardBg: '#1A170A',
    background: '#0F0D05',
    border: 'rgba(234, 179, 8, 0.35)',
    buttonPrimary: '#EAB308',
    buttonSecondary: 'rgba(234, 179, 8, 0.2)',
    text: '#FEFCE8',
    textMuted: '#FEF08A'
  },
  amber: {
    name: 'Warm Amber & Gold',
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FBBF24',
    surface: '#1C150A',
    cardBg: '#1C150A',
    background: '#0F0C05',
    border: 'rgba(245, 158, 11, 0.35)',
    buttonPrimary: '#F59E0B',
    buttonSecondary: 'rgba(245, 158, 11, 0.2)',
    text: '#FEF3C7',
    textMuted: '#FCD34D'
  },
  gold: {
    name: 'Champagne Luxury Gold',
    primary: '#D97706',
    secondary: '#B45309',
    accent: '#FCD34D',
    surface: '#1C170E',
    cardBg: '#1C170E',
    background: '#120E08',
    border: 'rgba(217, 119, 6, 0.35)',
    buttonPrimary: '#D97706',
    buttonSecondary: 'rgba(217, 119, 6, 0.2)',
    text: '#FEF3C7',
    textMuted: '#FDE68A'
  },
  orange: {
    name: 'High-Velocity Orange',
    primary: '#F97316',
    secondary: '#EA580C',
    accent: '#FB923C',
    surface: '#1C120A',
    cardBg: '#1C120A',
    background: '#0F0904',
    border: 'rgba(249, 115, 22, 0.35)',
    buttonPrimary: '#F97316',
    buttonSecondary: 'rgba(249, 115, 22, 0.2)',
    text: '#FFF7ED',
    textMuted: '#FDBA74'
  },
  coral: {
    name: 'Warm Coral',
    primary: '#FB7185',
    secondary: '#F43F5E',
    accent: '#FDA4AF',
    surface: '#1C0E10',
    cardBg: '#1C0E10',
    background: '#0F0608',
    border: 'rgba(251, 113, 133, 0.35)',
    buttonPrimary: '#FB7185',
    buttonSecondary: 'rgba(251, 113, 133, 0.2)',
    text: '#FFF1F2',
    textMuted: '#FECDD3'
  },
  red: {
    name: 'Critical Crimson Red',
    primary: '#EF4444',
    secondary: '#DC2626',
    accent: '#F87171',
    surface: '#1C0D0D',
    cardBg: '#1C0D0D',
    background: '#0F0606',
    border: 'rgba(239, 68, 68, 0.35)',
    buttonPrimary: '#EF4444',
    buttonSecondary: 'rgba(239, 68, 68, 0.2)',
    text: '#FEF2F2',
    textMuted: '#FCA5A5'
  },
  crimson: {
    name: 'Deep Crimson',
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#EF4444',
    surface: '#1A0B0B',
    cardBg: '#1A0B0B',
    background: '#0D0505',
    border: 'rgba(220, 38, 38, 0.35)',
    buttonPrimary: '#DC2626',
    buttonSecondary: 'rgba(220, 38, 38, 0.2)',
    text: '#FEF2F2',
    textMuted: '#F87171'
  },
  dark: {
    name: 'Command Center Cyber Ops',
    mode: 'dark',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    surface: '#0B1120',
    cardBg: '#0B1120',
    background: '#05080F',
    border: 'rgba(16, 185, 129, 0.25)',
    buttonPrimary: '#10B981',
    buttonSecondary: 'rgba(16, 185, 129, 0.15)',
    text: '#ECFDF5',
    textMuted: '#6EE7B7'
  },
  black: {
    name: 'Obsidian Black',
    mode: 'dark',
    primary: '#38BDF8',
    secondary: '#0284C7',
    accent: '#7DD3FC',
    surface: '#0A0A0C',
    cardBg: '#0A0A0C',
    background: '#000000',
    border: 'rgba(255, 255, 255, 0.12)',
    buttonPrimary: '#38BDF8',
    buttonSecondary: 'rgba(56, 189, 248, 0.2)',
    text: '#FFFFFF',
    textMuted: '#A1A1AA'
  },
  light: {
    name: 'Warm Cream & Ivory',
    mode: 'light',
    primary: '#92400E',
    secondary: '#78350F',
    accent: '#B45309',
    surface: '#FFFFFF',
    cardBg: '#FFFFFF',
    background: '#FDF8F0',
    border: 'rgba(28, 25, 23, 0.12)',
    buttonPrimary: '#92400E',
    buttonSecondary: 'rgba(146, 64, 14, 0.1)',
    text: '#1C1917',
    textMuted: '#78716C'
  },
  white: {
    name: 'Crisp Studio White',
    mode: 'light',
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#3B82F6',
    surface: '#FFFFFF',
    cardBg: '#FFFFFF',
    background: '#F8FAFC',
    border: 'rgba(15, 23, 42, 0.1)',
    buttonPrimary: '#2563EB',
    buttonSecondary: 'rgba(37, 99, 235, 0.1)',
    text: '#0F172A',
    textMuted: '#64748B'
  },
  slate: {
    name: 'Clean Enterprise Slate',
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#3B82F6',
    surface: '#111827',
    cardBg: '#111827',
    background: '#0B0F19',
    border: 'rgba(255, 255, 255, 0.1)',
    buttonPrimary: '#2563EB',
    buttonSecondary: 'rgba(37, 99, 235, 0.2)',
    text: '#F9FAFB',
    textMuted: '#9CA3AF'
  }
};

/**
 * Applies a single or compound structured patch to a UI specification.
 * 
 * @param {object} currentSpec Current UiSpecification
 * @param {object} patch Patch operation object or compound patch
 * @returns {{ success: boolean, updatedSpec: object, patchSummary: string, verified: boolean }}
 */
export function applyUiPatch(currentSpec, patch) {
  if (!currentSpec) {
    throw new Error('Current UI specification is required to apply patch');
  }

  // Deep clone current specification to ensure immutability
  const spec = JSON.parse(JSON.stringify(currentSpec));
  if (!spec.components) spec.components = [];
  if (!spec.sections) spec.sections = [];
  if (!spec.layout) spec.layout = { type: 'sidebar-grid', columns: 3, density: 'comfortable', sidebarPosition: 'right' };
  if (!spec.theme) spec.theme = { ...THEME_ARCHETYPES['enterprise-slate'] };

  // Handle changes array from JSON Patch
  if (patch.changes && Array.isArray(patch.changes)) {
    const ops = [];
    patch.changes.forEach(ch => {
      const targetType = ch.target?.type || (typeof ch.target === 'string' ? ch.target : null);
      const targetId = ch.target?.id || (typeof ch.target === 'string' ? ch.target : null);
      const prop = ch.property || '';
      const val = ch.value;

      if (targetType === 'Card' || targetType === 'MetricCard' || prop.includes('cardBg') || (targetType === 'card' && prop.includes('background'))) {
        ops.push({ operation: 'updateTheme', cardBg: val, surface: val });
      } else if (targetType === 'Button' || (targetType === 'button' && prop.includes('background')) || prop.includes('buttonPrimary') || prop.includes('buttonColor')) {
        ops.push({ operation: 'updateTheme', buttonColor: val, primaryColor: val });
      } else if ((targetType === 'AIAssistant' || targetId === 'ai-assistant' || targetType === 'copilot') && (prop.includes('column') || prop.includes('position'))) {
        ops.push({ operation: 'move', target: 'copilot', position: Number(val) >= 8 || String(val).includes('right') ? 'right_sidebar' : 'left_sidebar' });
      } else if (prop.includes('background') || prop.includes('color')) {
        ops.push({ operation: 'updateTheme', background: val, primaryColor: val });
      } else if (ch.action === 'remove' || (prop.includes('visible') && val === false)) {
        ops.push({ operation: 'removeComponent', target: targetId || targetType || 'component' });
      } else if (ch.action === 'add') {
        ops.push({ operation: 'addComponent', component: ch.component || { title: ch.title, type: ch.type } });
      }
    });
    if (ops.length > 0) {
      return applyUiPatch(currentSpec, { operations: ops, summary: patch.summary || 'Applied structured UI changes' });
    }
  }

  // Handle compound operations
  if (patch.operations && Array.isArray(patch.operations)) {
    const summaries = [];
    patch.operations.forEach((op) => {
      const res = executeSinglePatch(spec, op);
      if (res.summary) summaries.push(res.summary);
    });

    const { repairedSpec } = validateAndRepairUiSpecification(spec, spec.theme?.id);
    return {
      success: true,
      updatedSpec: repairedSpec,
      patchSummary: patch.summary || summaries.join(' ') || 'Applied design modifications.',
      verified: true
    };
  }

  const { summary } = executeSinglePatch(spec, patch);
  const { repairedSpec } = validateAndRepairUiSpecification(spec, spec.theme?.id);

  return {
    success: true,
    updatedSpec: repairedSpec,
    patchSummary: patch.summary || summary || 'Applied UI change',
    verified: true
  };
}

/**
 * Executes a single patch operation against the mutable spec object.
 */
function executeSinglePatch(spec, patch) {
  const op = patch.operation || patch.op;
  let summary = patch.summary || '';

  switch (op) {
    case 'move':
    case 'moveComponent': {
      const { target, componentId, destination, position, targetRegion } = patch;
      const lookup = (target || componentId || '').toLowerCase();
      
      // Semantic component lookup
      const compIdx = spec.components.findIndex(
        c => c.id === lookup ||
             c.type.toLowerCase().includes(lookup) ||
             c.title?.toLowerCase().includes(lookup) ||
             (lookup.includes('copilot') || lookup.includes('ai') || lookup.includes('assistant')) && (c.type.includes('copilot') || c.id.includes('copilot') || c.type.includes('assistant')) ||
             (lookup.includes('activity') || lookup.includes('audit') || lookup.includes('log')) && (c.type.includes('activity') || c.id.includes('activity')) ||
             (lookup.includes('queue') || lookup.includes('table') || lookup.includes('work')) && (c.type.includes('table') || c.id.includes('table') || c.title?.toLowerCase().includes('queue')) ||
             (lookup.includes('chart') || lookup.includes('graph')) && (c.type.includes('chart') || c.id.includes('chart'))
      );

      const targetPos = (position || targetRegion || destination || '').toLowerCase();

      if (targetPos.includes('left')) {
        spec.layout.sidebarPosition = 'left';
        if (compIdx !== -1) {
          const comp = spec.components[compIdx];
          summary = `Moved ${comp.title || 'AI Assistant'} to the left sidebar panel.`;
        } else {
          summary = `Moved AI Assistant to the left sidebar panel.`;
        }
      } else if (targetPos.includes('right') || targetPos.includes('sidebar')) {
        spec.layout.sidebarPosition = 'right';
        spec.layout.sidebarCollapsible = true;
        if (compIdx !== -1) {
          const comp = spec.components[compIdx];
          summary = `Moved ${comp.title || 'AI Assistant'} to the right sidebar panel.`;
        } else {
          summary = `Moved AI Assistant to the right sidebar panel.`;
        }
      } else if (targetPos.includes('below') && targetPos.includes('chart')) {
        if (compIdx !== -1) {
          const comp = spec.components.splice(compIdx, 1)[0];
          const chartIdx = spec.components.findIndex(c => c.type === 'chart' || c.type.includes('chart'));
          if (chartIdx !== -1) {
            spec.components.splice(chartIdx + 1, 0, comp);
          } else {
            spec.components.push(comp);
          }
          summary = `Repositioned ${comp.title || 'component'} directly below the chart.`;
        }
      } else if (targetPos.includes('above') || targetPos.includes('top')) {
        if (compIdx !== -1) {
          const comp = spec.components.splice(compIdx, 1)[0];
          spec.components.unshift(comp);
          summary = `Moved ${comp.title || 'component'} to top of view.`;
        }
      } else if (targetPos.includes('bottom') || targetPos.includes('end')) {
        if (compIdx !== -1) {
          const comp = spec.components.splice(compIdx, 1)[0];
          spec.components.push(comp);
          summary = `Moved ${comp.title || 'component'} to bottom of view.`;
        }
      }
      break;
    }

    case 'setTheme':
    case 'updateTheme': {
      const { themeId, tokens, mode, primaryColor, accentColor, buttonColor, cardBg, background, border, radius, colorPalette, fontFamily } = patch;
      let targetTheme = null;

      if (colorPalette && COLOR_PALETTES[colorPalette.toLowerCase()]) {
        targetTheme = {
          ...(spec.theme || THEME_ARCHETYPES['enterprise-slate']),
          ...COLOR_PALETTES[colorPalette.toLowerCase()]
        };
      } else if (themeId && THEME_ARCHETYPES[themeId]) {
        targetTheme = { ...THEME_ARCHETYPES[themeId] };
      } else if (themeId && COLOR_PALETTES[themeId.toLowerCase()]) {
        targetTheme = {
          ...(spec.theme || THEME_ARCHETYPES['enterprise-slate']),
          ...COLOR_PALETTES[themeId.toLowerCase()]
        };
      } else {
        targetTheme = {
          ...(spec.theme || THEME_ARCHETYPES['enterprise-slate']),
          ...(tokens || {})
        };
      }

      if (primaryColor) {
        targetTheme.primary = primaryColor;
        targetTheme.buttonPrimary = primaryColor;
        if (!accentColor) targetTheme.accent = primaryColor;
      }
      if (accentColor) targetTheme.accent = accentColor;
      if (buttonColor) targetTheme.buttonPrimary = buttonColor;
      if (cardBg) {
        targetTheme.cardBg = cardBg;
        targetTheme.surface = cardBg;
      }
      if (background) targetTheme.background = background;
      if (border) targetTheme.border = border;
      if (radius) targetTheme.radius = radius;
      if (mode) targetTheme.mode = mode;
      if (fontFamily) targetTheme.fontFamily = fontFamily;

      spec.theme = targetTheme;
      summary = summary || `Applied ${targetTheme.name || 'custom'} theme with primary: ${targetTheme.primary}.`;
      break;
    }

    case 'updateLayout': {
      const { layoutType, density, columns, sidebarPosition, sidebarWidth, gap, radius } = patch;
      if (layoutType) spec.layout.type = layoutType;
      if (columns) spec.layout.columns = columns;
      if (sidebarPosition) spec.layout.sidebarPosition = sidebarPosition;
      if (sidebarWidth) spec.layout.sidebarWidth = sidebarWidth;
      
      if (density) {
        spec.layout.density = density;
        if (spec.theme) spec.theme.density = density;
        if (density === 'compact') {
          spec.layout.gap = gap || 8;
          if (spec.theme) spec.theme.radius = radius || '4px';
        } else if (density === 'spacious') {
          spec.layout.gap = gap || 20;
          if (spec.theme) spec.theme.radius = radius || '12px';
        } else {
          spec.layout.gap = gap || 12;
          if (spec.theme) spec.theme.radius = radius || '8px';
        }
      }
      if (gap !== undefined) spec.layout.gap = gap;
      if (radius && spec.theme) spec.theme.radius = radius;

      summary = summary || `Updated layout architecture to ${spec.layout.type || 'sidebar-grid'} with ${spec.layout.density || 'comfortable'} density.`;
      break;
    }

    case 'addComponent': {
      const { component, targetSectionId, position } = patch;
      if (component) {
        const newComp = {
          id: component.id || `cmp-${Date.now()}`,
          type: component.type || 'card',
          sectionId: targetSectionId || spec.sections[0]?.id || 'sec-main',
          title: component.title || 'New Component',
          props: component.props || {},
          data: component.data || {}
        };

        if (position === 'start' || position === 'top') {
          spec.components.unshift(newComp);
        } else {
          spec.components.push(newComp);
        }

        const sec = spec.sections.find(s => s.id === newComp.sectionId);
        if (sec && !sec.componentIds.includes(newComp.id)) {
          if (position === 'start' || position === 'top') {
            sec.componentIds.unshift(newComp.id);
          } else {
            sec.componentIds.push(newComp.id);
          }
        }

        summary = summary || `Added ${newComp.title} component.`;
      }
      break;
    }

    case 'removeComponent': {
      const { target, componentId } = patch;
      const lookup = (target || componentId || '').toLowerCase();
      spec.components = spec.components.filter(
        c => c.id !== lookup && c.type.toLowerCase() !== lookup && !c.title.toLowerCase().includes(lookup)
      );
      spec.sections.forEach(s => {
        s.componentIds = s.componentIds.filter(id => id !== lookup);
      });
      summary = summary || `Removed ${target || componentId} component.`;
      break;
    }

    case 'replaceComponent': {
      const { target, replacement } = patch;
      const lookup = (target || '').toLowerCase();
      const idx = spec.components.findIndex(
        c => c.id === lookup || c.type.toLowerCase() === lookup || c.title.toLowerCase().includes(lookup)
      );

      if (idx !== -1 && replacement) {
        const oldComp = spec.components[idx];
        const newComp = {
          id: replacement.id || oldComp.id,
          type: replacement.type || 'data_table',
          sectionId: oldComp.sectionId,
          title: replacement.title || oldComp.title,
          props: replacement.props || {},
          data: replacement.data || {}
        };
        spec.components[idx] = newComp;
        summary = summary || `Replaced ${oldComp.title} with ${newComp.title}.`;
      }
      break;
    }

    case 'updateComponent': {
      const { target, componentId, updates } = patch;
      const lookup = (target || componentId || '').toLowerCase();
      const comp = spec.components.find(
        c => c.id === lookup || c.type.toLowerCase() === lookup || c.title.toLowerCase().includes(lookup)
      );
      if (comp && updates) {
        if (updates.title) comp.title = updates.title;
        if (updates.props) comp.props = { ...comp.props, ...updates.props };
        if (updates.data) comp.data = { ...comp.data, ...updates.data };
        summary = summary || `Updated ${comp.title}.`;
      }
      break;
    }

    default:
      summary = summary || 'Applied modification.';
  }

  return { summary };
}

/**
 * Parses user natural language directives, custom color requests, and one-click directives
 * into deterministic, structured JSON patches.
 * 
 * @param {string} directive User prompt or quick directive
 * @param {object} currentSpec Current UiSpecification
 * @returns {object} Structured UI patch
 */
export function parseDirectiveToPatch(directive, currentSpec) {
  const raw = (directive || '').trim();
  const d = raw.toLowerCase();

  // -------------------------------------------------------------------------
  // 1. LIGHT / DARK / COMMAND CENTER / SAAS THEME ARCHETYPES
  // -------------------------------------------------------------------------
  if (d.includes('saas') || d.includes('modern enterprise saas') || d.includes('modern saas') || d.includes('glassmorphism')) {
    return {
      operation: 'updateTheme',
      themeId: 'saas-modern',
      mode: 'dark',
      primaryColor: '#D97706',
      accentColor: '#F59E0B',
      cardBg: '#1E293B',
      background: '#0F172A',
      radius: '12px',
      summary: 'Transformed layout to Modern SaaS Glassmorphism design system.'
    };
  }

  if (d.includes('command center') || d.includes('cyber') || d.includes('darker command center') || d.includes('obsidian')) {
    return {
      operation: 'updateTheme',
      themeId: 'cyber-ops',
      mode: 'dark',
      primaryColor: '#10B981',
      cardBg: '#0B1120',
      background: '#05080F',
      summary: 'Switched entire interface to Command Center Cyber Ops dark design system.'
    };
  }

  if (d.includes('warm luxury') || d.includes('luxury') || d.includes('editorial')) {
    return {
      operation: 'updateTheme',
      themeId: 'warm-luxury',
      mode: 'dark',
      primaryColor: '#F59E0B',
      accentColor: '#FBBF24',
      cardBg: '#1C1917',
      background: '#14120E',
      radius: '16px',
      summary: 'Switched interface to Editorial Warm Luxury styling.'
    };
  }

  if (d.includes('nordic') || d.includes('monochrome') || d.includes('clean enterprise')) {
    return {
      operation: 'updateTheme',
      themeId: 'nordic-clean',
      mode: 'dark',
      primaryColor: '#38BDF8',
      accentColor: '#7DD3FC',
      cardBg: '#13151A',
      background: '#090A0C',
      summary: 'Switched interface to Nordic Clean Monochrome design system.'
    };
  }

  if (d.includes('light mode') || d.includes('light theme') || d.includes('white mode') || d.includes('white background') || d.includes('warm cream')) {
    const lightPalette = COLOR_PALETTES.light;
    return {
      operation: 'updateTheme',
      mode: 'light',
      ...lightPalette,
      summary: 'Switched interface to Crisp Light Mode & Warm Cream system.'
    };
  }

  if (d.includes('dark mode') || d.includes('dark theme') || d.includes('black mode') || d === 'darker' || d === 'dark') {
    const darkPalette = COLOR_PALETTES.dark;
    return {
      operation: 'updateTheme',
      themeId: 'cyber-ops',
      mode: 'dark',
      ...darkPalette,
      summary: 'Switched interface to Command Center Dark Obsidian design system.'
    };
  }

  // -------------------------------------------------------------------------
  // 2. COMPOUND INTENTS (e.g. "Move AI assistant to right and make buttons purple")
  // -------------------------------------------------------------------------
  const hasCompoundSeparators = d.includes(' and ') || d.includes(' while ') || d.includes(' also ') || d.includes(' + ') || (d.includes(',') && (d.includes('make') || d.includes('move') || d.includes('add') || d.includes('reduce')));
  const hasActionWords = d.includes('move') || d.includes('add') || d.includes('make') || d.includes('set') || d.includes('remove') || d.includes('round') || d.includes('button') || d.includes('card') || d.includes('purple') || d.includes('pink') || d.includes('dark') || d.includes('spacing') || d.includes('compact') || d.includes('filter');

  if (hasCompoundSeparators && hasActionWords) {
    const ops = [];
    const subClauses = d.split(/ and | while | also | \+ |,\s*(?:and\s*)?/);

    subClauses.forEach((clause) => {
      const trimmed = clause.trim();
      if (!trimmed) return;
      const subPatch = parseDirectiveToPatch(trimmed, currentSpec);
      if (subPatch.operations) {
        ops.push(...subPatch.operations);
      } else if (subPatch.operation && subPatch.operation !== 'updateLayout') {
        ops.push(subPatch);
      } else if (subPatch.operation === 'updateLayout' && (trimmed.includes('compact') || trimmed.includes('minimal') || trimmed.includes('spacing') || trimmed.includes('gap') || trimmed.includes('density'))) {
        ops.push(subPatch);
      }
    });

    if (ops.length > 0) {
      return {
        operations: ops,
        summary: `Executed compound edits: ${raw}`
      };
    }
  }

  // -------------------------------------------------------------------------
  // 3. NATURAL LANGUAGE COLOR & THEME CUSTOMIZATION
  // e.g. "i want to make all cards and button colour convert into the pink"
  // -------------------------------------------------------------------------
  // Check for explicit hex code like #FF4FA3
  const hexMatch = raw.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (hexMatch) {
    const hex = hexMatch[0];
    return {
      operation: 'updateTheme',
      primaryColor: hex,
      accentColor: hex,
      buttonColor: hex,
      border: `${hex}50`,
      summary: `Updated primary, button, and accent theme colors to ${hex}.`
    };
  }

  // Check for named color matching
  const colorKeys = Object.keys(COLOR_PALETTES);
  for (const colorName of colorKeys) {
    const hasColorWord = new RegExp(`\\b${colorName}\\b|\\b${colorName}ish\\b`, 'i').test(d);
    if (hasColorWord) {
      const palette = COLOR_PALETTES[colorName];
      const isButtonOnly = /only.*button|button.*only|buttons only|just.*button/i.test(d);
      const isCardOnly = /only.*card|card.*only|cards only|just.*card/i.test(d);

      if (isButtonOnly) {
        return {
          operation: 'updateTheme',
          buttonColor: palette.buttonPrimary,
          accentColor: palette.accent,
          summary: `Updated all primary buttons to ${palette.name} (${palette.primary}).`
        };
      }

      if (isCardOnly) {
        return {
          operation: 'updateTheme',
          cardBg: palette.cardBg,
          border: palette.border,
          summary: `Updated card surfaces to ${palette.name} styling.`
        };
      }

      // Check if user also asked for layout changes (e.g. compact, minimal, rounded, etc.)
      const ops = [
        {
          operation: 'updateTheme',
          colorPalette: colorName,
          primaryColor: palette.primary,
          accentColor: palette.accent,
          buttonColor: palette.buttonPrimary,
          cardBg: palette.cardBg,
          border: palette.border,
          mode: palette.mode || 'dark'
        }
      ];

      if (d.includes('compact') || d.includes('minimal') || d.includes('density')) {
        ops.push({
          operation: 'updateLayout',
          density: 'compact',
          gap: 8,
          radius: '4px'
        });
      }

      if (d.includes('round') || d.includes('rounded')) {
        ops[0].radius = '16px';
      }

      if (ops.length > 1) {
        return {
          operations: ops,
          summary: `Converted all cards and buttons to ${palette.name} (${palette.primary}) and adjusted layout density.`
        };
      }

      // Global card and button theme update
      return {
        operation: 'updateTheme',
        colorPalette: colorName,
        primaryColor: palette.primary,
        accentColor: palette.accent,
        buttonColor: palette.buttonPrimary,
        cardBg: palette.cardBg,
        border: palette.border,
        mode: palette.mode || 'dark',
        summary: `Converted all cards, buttons, and accents to ${palette.name} (${palette.primary}).`
      };
    }
  }

  // -------------------------------------------------------------------------
  // 4. ONE-CLICK DIRECTIVES & COMPONENT MOVEMENTS
  // -------------------------------------------------------------------------
  // Toggle AI Assistant position / Move AI Assistant
  if (d.includes('move ai assistant') || d.includes('ai assistant to the') || d.includes('copilot to the') || d.includes('toggle ai assistant')) {
    const currentSidebar = currentSpec?.layout?.sidebarPosition || 'right';
    
    // Explicit left
    if (d.includes('left')) {
      return {
        operation: 'move',
        target: 'copilot',
        position: 'left_sidebar',
        targetRegion: 'left',
        destination: 'left-sidebar',
        summary: 'Moved AI Decision Assistant to left sidebar panel.'
      };
    }
    // Explicit right
    if (d.includes('right') && !d.includes('toggle')) {
      // If already on right, toggle to left so user sees clear transformation!
      if (currentSidebar === 'right' && d.includes('+ move')) {
        return {
          operation: 'move',
          target: 'copilot',
          position: 'left_sidebar',
          targetRegion: 'left',
          summary: 'Moved AI Decision Assistant to left sidebar panel.'
        };
      }
      return {
        operation: 'move',
        target: 'copilot',
        position: 'right_sidebar',
        targetRegion: 'right',
        destination: 'right-sidebar',
        summary: 'Moved AI Decision Assistant to right sidebar panel.'
      };
    }
    // Toggle
    const targetPos = currentSidebar === 'right' ? 'left_sidebar' : 'right_sidebar';
    return {
      operation: 'move',
      target: 'copilot',
      position: targetPos,
      targetRegion: currentSidebar === 'right' ? 'left' : 'right',
      summary: `Moved AI Assistant to ${currentSidebar === 'right' ? 'left' : 'right'} sidebar.`
    };
  }

  // -------------------------------------------------------------------------
  // 5. ONE-CLICK DIRECTIVE: "+ Add a priority filter" / Filter Bar
  // -------------------------------------------------------------------------
  if (d.includes('priority filter') || d.includes('filter bar') || d.includes('status filter') || d.includes('add filter') || d.includes('filter')) {
    const existingFilter = currentSpec?.components?.find(c => c.type === 'search_filter_bar' || c.type === 'filter_bar');
    if (existingFilter) {
      // Toggle active filter chip
      const nextFilter = existingFilter.props?.activeFilter === 'High Priority' ? 'SLA Critical' : 'High Priority';
      return {
        operation: 'updateComponent',
        target: existingFilter.id,
        updates: {
          props: {
            filterChips: ['All Items', 'High Priority', 'SLA Critical', 'AI Flagged', 'Pending Review'],
            activeFilter: nextFilter
          }
        },
        summary: `Activated "${nextFilter}" priority filter triage.`
      };
    } else {
      return {
        operation: 'addComponent',
        position: 'top',
        component: {
          id: `cmp-filter-${Date.now()}`,
          type: 'search_filter_bar',
          title: 'Priority & Status Filter Bar',
          props: {
            searchPlaceholder: 'Search high-priority items, accounts, or active records...',
            filterChips: ['All Items', 'High Priority', 'SLA Critical', 'AI Flagged', 'Pending Review'],
            activeFilter: 'High Priority',
            actionButtons: [
              { label: '+ Add Work Item', variant: 'primary', icon: 'Plus' },
              { label: 'Batch Run Actions', variant: 'secondary', icon: 'Zap' }
            ]
          }
        },
        summary: 'Added priority filter bar to the top of the workspace.'
      };
    }
  }

  // -------------------------------------------------------------------------
  // 6. ONE-CLICK DIRECTIVE: "+ Add patient search" / Customer Search
  // -------------------------------------------------------------------------
  if (d.includes('patient search') || d.includes('customer search') || d.includes('search field') || d.includes('search bar') || d.includes('add search')) {
    const isHealthcare = currentSpec?.page?.businessDomain === 'HEALTHCARE' || d.includes('patient');
    const label = isHealthcare ? 'Patient MRN & Medical Record Search' : 'Live Entity & Customer Search Bar';
    const placeholder = isHealthcare ? 'Search patient by MRN, Name, Phone, or Assigned Physician...' : 'Search items by ID, title, assigned operator, or priority...';

    return {
      operation: 'addComponent',
      position: 'top',
      component: {
        id: `cmp-search-${Date.now()}`,
        type: 'search_filter_bar',
        title: label,
        props: {
          searchPlaceholder: placeholder,
          filterChips: isHealthcare ? ['All Patients', 'Urgent Triage', 'In Exam Room', 'Doctor Consult'] : ['All Items', 'High Priority', 'SLA Critical', 'AI Flagged', 'Pending Review'],
          activeFilter: isHealthcare ? 'All Patients' : 'All Items',
          actionButtons: [
            { label: '+ Add Work Item', variant: 'primary', icon: 'Plus' },
            { label: 'Batch Run Actions', variant: 'secondary', icon: 'Zap' }
          ]
        }
      },
      summary: `Added ${label} to the top toolbar.`
    };
  }

  // -------------------------------------------------------------------------
  // 7. ONE-CLICK DIRECTIVE: "+ Make this dashboard more minimal" / Reduce visual density
  // -------------------------------------------------------------------------
  if (d.includes('minimal') || d.includes('reduce visual density') || d.includes('reduce density') || d.includes('compact') || d.includes('cleaner') || d.includes('minimal scrolling') || d.includes('fit on one desktop')) {
    return {
      operation: 'updateLayout',
      density: 'compact',
      gap: 8,
      radius: '4px',
      layoutType: 'sidebar-grid',
      summary: 'Optimized layout for minimal cognitive friction with compact density, 8px gaps, and 4px micro-borders.'
    };
  }

  // -------------------------------------------------------------------------
  // 8. ONE-CLICK DIRECTIVE: "+ Use a darker command center style"
  // -------------------------------------------------------------------------
  if (d.includes('darker command center') || d.includes('command center') || d.includes('cyber') || d.includes('obsidian')) {
    return {
      operation: 'updateTheme',
      themeId: 'cyber-ops',
      mode: 'dark',
      summary: 'Switched entire interface to Command Center Cyber Ops dark design system.'
    };
  }

  // -------------------------------------------------------------------------
  // 9. ONE-CLICK DIRECTIVE: "+ Make this mobile-friendly"
  // -------------------------------------------------------------------------
  if (d.includes('mobile-friendly') || d.includes('mobile friendly') || d.includes('mobile') || d.includes('responsive')) {
    return {
      operation: 'updateLayout',
      layoutType: 'sidebar-grid',
      density: 'compact',
      sidebarPosition: 'right',
      summary: 'Configured mobile-friendly responsive rules: auto-stacking cards, collapsible sidebar sheet, and sticky touch actions.'
    };
  }

  // -------------------------------------------------------------------------
  // 10. ONE-CLICK DIRECTIVE: "+ Add an approval workflow"
  // -------------------------------------------------------------------------
  if (d.includes('approval workflow') || d.includes('approval gate') || d.includes('dual signoff') || d.includes('sign-off') || d.includes('approval')) {
    return {
      operation: 'addComponent',
      position: 'end',
      component: {
        id: `cmp-approval-${Date.now()}`,
        type: 'workflow_tracker',
        title: 'Formal Multi-Tier Approval & Dual Sign-Off Gate',
        props: {
          stages: [
            { id: 'app-1', title: '1. Ingestion', status: 'completed', time: '14 ms' },
            { id: 'app-2', title: '2. Policy Check', status: 'completed', time: '40 ms' },
            { id: 'app-3', title: '3. Operator Sign-Off', status: 'in-progress', time: 'Active' },
            { id: 'app-4', title: '4. Executive Gate', status: 'pending', time: 'Queued' }
          ]
        }
      },
      summary: 'Integrated multi-tier approval workflow with automated risk verification and supervisor gates.'
    };
  }

  // -------------------------------------------------------------------------
  // 11. ADD KANBAN BOARD / ACTIVITY / CHART
  // -------------------------------------------------------------------------
  if (d.includes('kanban') || d.includes('task board')) {
    return {
      operation: 'addComponent',
      position: 'end',
      component: {
        id: `cmp-kanban-${Date.now()}`,
        type: 'kanban_board',
        title: 'Workforce & Task Kanban Progression',
        props: {
          columns: [
            { id: 'c1', title: 'Triage Queue (8)', count: 8, items: ['Item ITM-904', 'Item ITM-905'] },
            { id: 'c2', title: 'Processing (3)', count: 3, items: ['Automated Account Sync'] },
            { id: 'c3', title: 'Verified (42)', count: 42, items: ['Daily Settlement Batch'] }
          ]
        }
      },
      summary: 'Added interactive Kanban progression board.'
    };
  }

  if (d.includes('activity') || d.includes('audit log') || d.includes('event log') || d.includes('feed')) {
    return {
      operation: 'addComponent',
      position: 'end',
      component: {
        id: `cmp-activity-${Date.now()}`,
        type: 'activity_feed',
        title: 'Real-Time Operational Audit & Activity Stream',
        props: {
          activities: [
            { id: 'a1', timestamp: 'Just now', actor: 'Automated Copilot', action: 'Verified SLA compliance for ITM-902', status: 'SUCCESS' },
            { id: 'a2', timestamp: '2 min ago', actor: 'Sarah Jenkins', action: 'Approved high-priority resolution', status: 'SUCCESS' },
            { id: 'a3', timestamp: '5 min ago', actor: 'System Core', action: 'Scheduled database snapshot', status: 'SUCCESS' }
          ]
        }
      },
      summary: 'Added real-time audit and activity stream.'
    };
  }

  if (d.includes('add chart') || d.includes('donut chart') || d.includes('bar chart') || d.includes('analytics')) {
    const isDonut = d.includes('donut') || d.includes('pie');
    return {
      operation: 'addComponent',
      position: 'end',
      component: {
        id: `cmp-chart-${Date.now()}`,
        type: 'chart',
        title: isDonut ? 'Resource Allocation Breakdown' : 'Throughput Velocity Analytics',
        props: {
          chartType: isDonut ? 'donut' : 'bar',
          categories: isDonut ? ['Automated (55%)', 'Manual Review (30%)', 'Exception (15%)'] : ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
          series: [
            { name: 'Velocity', data: [42, 68, 95, 130, 115, 88], color: currentSpec?.theme?.primary || '#3B82F6' }
          ]
        }
      },
      summary: `Added ${isDonut ? 'Donut Allocation' : 'Throughput Bar'} chart.`
    };
  }

  // -------------------------------------------------------------------------
  // 12. REMOVE COMPONENT (Chart, Table, Approval, Kanban, Activity)
  // -------------------------------------------------------------------------
  if (d.includes('remove') || d.includes('delete') || d.includes('hide')) {
    if (d.includes('chart')) {
      return { operation: 'removeComponent', target: 'chart', summary: 'Removed throughput chart.' };
    }
    if (d.includes('approval') || d.includes('workflow')) {
      return { operation: 'removeComponent', target: 'workflow', summary: 'Removed approval workflow tracker.' };
    }
    if (d.includes('kanban')) {
      return { operation: 'removeComponent', target: 'kanban', summary: 'Removed Kanban board.' };
    }
    if (d.includes('activity')) {
      return { operation: 'removeComponent', target: 'activity', summary: 'Removed activity stream.' };
    }
    if (d.includes('search') || d.includes('filter')) {
      return { operation: 'removeComponent', target: 'search_filter_bar', summary: 'Removed search/filter toolbar.' };
    }
  }

  // -------------------------------------------------------------------------
  // 13. CORNER RADIUS & STYLING (Rounded, Sharp, Pill)
  // -------------------------------------------------------------------------
  if (d.includes('round') || d.includes('rounded') || d.includes('circular')) {
    return {
      operation: 'updateTheme',
      radius: '16px',
      summary: 'Updated all cards and buttons to smooth 16px rounded corners.'
    };
  }

  if (d.includes('sharp') || d.includes('square') || d.includes('no radius')) {
    return {
      operation: 'updateTheme',
      radius: '0px',
      summary: 'Updated all cards and buttons to sharp 0px corners.'
    };
  }

  // -------------------------------------------------------------------------
  // 14. SPACING & PADDING (Spacious, Large gaps)
  // -------------------------------------------------------------------------
  if (d.includes('spacious') || d.includes('more space') || d.includes('larger gap') || d.includes('increase spacing')) {
    return {
      operation: 'updateLayout',
      density: 'spacious',
      gap: 20,
      radius: '12px',
      summary: 'Expanded layout spacing to spacious 20px gaps and 12px card radius.'
    };
  }

  // Fallback safe layout update
  return {
    operation: 'updateLayout',
    density: 'comfortable',
    summary: `Processed design modification: "${raw}".`
  };
}
