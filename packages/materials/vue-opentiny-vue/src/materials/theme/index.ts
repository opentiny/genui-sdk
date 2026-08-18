import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeDescriptor,
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

function resolveThemeId(theme: string, ctx: ThemeApplyContext) {
  if (themes.some((item) => item.id === theme)) {
    return theme;
  }
  return ctx.colorScheme ?? ctx.systemColorScheme;
}

export function createOpenTinyMaterialsTheme(): IMaterialsTheme {
  return {
    themes,
    Root: OpenTinyThemeRoot,
    apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const id = resolveThemeId(theme, ctx);
      const themeTool = new ThemeTool();
      themeTool.changeTheme(buildThemeConfig(id, ctx.scopeId));
      // 通过 Root 实例句柄调用其暴露的方法
      const instance = ctx.rootInstance as { setColorScheme?: (scheme: 'light' | 'dark') => void } | undefined;
      instance?.setColorScheme?.(id === 'dark' ? 'dark' : 'light');
      return {
        id,
        // 渲染后动态下发给 Root 组件的 props（TinyConfigProvider 对 theme 有响应式 watch）
        props: {
          theme: {
            data: {
              'tv-base-color-brand': id === 'dark' ? '#B3B3B3' : '#1476ff',
            },
          },
        },
        dispose: () => {
          themeTool.changeTheme({ css: ' ' });
        },
      };
    },
  };
}
