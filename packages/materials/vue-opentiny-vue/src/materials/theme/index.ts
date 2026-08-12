import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeColorScheme,
  type ThemeDescriptor,
  type ThemeDisposer,
} from '@opentiny/genui-sdk-core';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { OpenTinyThemeRoot } from './ThemeRoot';

const themes: ThemeDescriptor[] = [
  { id: 'light', label: '浅色', colorScheme: 'light' },
  { id: 'dark', label: '深色', colorScheme: 'dark' },
  { id: 'lite', label: '清新', colorScheme: 'light' },
];

function transformTheme(themeConfig: { css?: string }, scopeId: string) {
  const next = structuredClone(themeConfig) as { css: string };
  next.css = (next.css || '').split(':host').join(`#${scopeId}`).split(':root').join(`#${scopeId}`);
  return next;
}

function buildThemeConfig(themeId: string, scopeId: string) {
  if (themeId === 'dark') {
    return transformTheme(tinyDarkTheme, scopeId);
  }
  if (themeId === 'lite') {
    return transformTheme(tinyOldTheme, scopeId);
  }
  return { css: ' ' };
}

function resolveThemeId(theme: string, systemColorScheme: ThemeColorScheme) {
  if (themes.some((item) => item.id === theme)) {
    return theme;
  }
  return systemColorScheme === 'dark' ? 'dark' : 'light';
}

export function createOpenTinyMaterialsTheme(): IMaterialsTheme {
  return {
    themes,
    Root: OpenTinyThemeRoot,
    apply(theme: string, ctx: ThemeApplyContext): ThemeDisposer {
      const themeId = resolveThemeId(theme, ctx.systemColorScheme);
      const themeTool = new ThemeTool();
      themeTool.changeTheme(buildThemeConfig(themeId, ctx.scopeId));
      return () => {
        themeTool.changeTheme({ css: ' ' });
      };
    },
  };
}
