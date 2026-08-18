import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeDescriptor,
} from '@opentiny/genui-sdk-core';

const themes: ThemeDescriptor[] = [
  { id: 'light', label: '浅色', colorScheme: 'light' },
  { id: 'dark', label: '深色', colorScheme: 'dark' },
];

const DARK_CLASS = 'dark';

function getScopeElement(ctx: ThemeApplyContext) {
  return ctx.rootEl ?? (typeof document !== 'undefined' ? document.getElementById(ctx.scopeId) : null);
}

function resolveThemeId(theme: string, ctx: ThemeApplyContext) {
  if (themes.some((item) => item.id === theme)) {
    return theme;
  }
  return ctx.colorScheme ?? ctx.systemColorScheme;
}

export function createElementPlusMaterialsTheme(): IMaterialsTheme {
  return {
    themes,
    apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const id = resolveThemeId(theme, ctx);
      const el = getScopeElement(ctx);
      if (!el) {
        return { id, dispose: () => {} };
      }

      if (id === 'dark') {
        el.classList.add(DARK_CLASS);
      } else {
        el.classList.remove(DARK_CLASS);
      }

      return {
        id,
        dispose: () => {
          el.classList.remove(DARK_CLASS);
        },
      };
    },
  };
}
