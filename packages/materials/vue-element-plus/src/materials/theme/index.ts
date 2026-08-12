import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeColorScheme,
  type ThemeDescriptor,
  type ThemeDisposer,
} from '@opentiny/genui-sdk-core';

const themes: ThemeDescriptor[] = [
  { id: 'light', label: '浅色', colorScheme: 'light' },
  { id: 'dark', label: '深色', colorScheme: 'dark' },
];

const DARK_CLASS = 'dark';

function getScopeElement(ctx: ThemeApplyContext) {
  return ctx.rootEl ?? (typeof document !== 'undefined' ? document.getElementById(ctx.scopeId) : null);
}

function resolveColorScheme(theme: string, systemColorScheme: ThemeColorScheme): ThemeColorScheme {
  if (theme === 'auto') {
    return systemColorScheme;
  }
  return theme === 'dark' ? 'dark' : 'light';
}

export function createElementPlusMaterialsTheme(): IMaterialsTheme {
  return {
    themes,
    apply(theme: string, ctx: ThemeApplyContext): ThemeDisposer {
      const el = getScopeElement(ctx);
      if (!el) {
        return () => {};
      }

      if (resolveColorScheme(theme, ctx.systemColorScheme) === 'dark') {
        el.classList.add(DARK_CLASS);
      } else {
        el.classList.remove(DARK_CLASS);
      }

      return () => {
        el.classList.remove(DARK_CLASS);
      };
    },
  };
}
