import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeColorScheme,
  type ThemeDescriptor,
} from '@opentiny/genui-sdk-core';
import { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { shallowRef } from 'vue';
import { createOpenTinyThemeRoot, type OpenTinyThemeState } from './ThemeRoot';

const themes: ThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
  { id: 'lite', colorScheme: 'light' },
];

function resolveDescriptor(
  theme: string,
  systemColorScheme: ThemeColorScheme,
): ThemeDescriptor {
  return (
    themes.find((item) => item.id === theme) ?? {
      id: systemColorScheme,
      colorScheme: systemColorScheme,
    }
  );
}

// 只取 css 部分（data 品牌色由 Root 按 colorScheme 自行生成），作用域改写由 Root 完成
function buildThemeConfig(themeId: string): { css: string } {
  if (themeId === 'dark') {
    return { css: tinyDarkTheme.css };
  }
  if (themeId === 'lite') {
    return { css: tinyOldTheme.css };
  }
  return { css: ' ' };
}

export function createOpenTinyMaterialsTheme(): IMaterialsTheme {
  // 每个实例独立的状态与 Root（工厂每被调用一次即得到一套，供单个使用方独占）
  const state = shallowRef<OpenTinyThemeState>({
    themeConfig: { css: ' ' },
    colorScheme: 'light',
  });
  const Root = createOpenTinyThemeRoot(state);

  return {
    themes,
    apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const descriptor = resolveDescriptor(theme, ctx.systemColorScheme);
      // 只更新本实例状态，Root 类型保持不变，避免子树重挂载
      state.value = {
        themeConfig: buildThemeConfig(descriptor.id),
        colorScheme: descriptor.colorScheme ?? 'light',
      };
      return { descriptor, Root, dispose: () => {} };
    },
  };
}
