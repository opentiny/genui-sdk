import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeColorScheme,
  type ThemeDescriptor,
} from '@opentiny/genui-sdk-core';
import { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { OpenTinyThemeRoot, setOpenTinyThemeState } from './ThemeRoot';

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
  return {
    themes,
    apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const descriptor = resolveDescriptor(theme, ctx.systemColorScheme);
      // 主题数据喂给 Root（模块级状态），Root 内部响应式注入/清理，apply 无副作用
      setOpenTinyThemeState({
        themeConfig: buildThemeConfig(descriptor.id),
        colorScheme: descriptor.colorScheme ?? 'light',
      });
      return {
        descriptor,
        Root: OpenTinyThemeRoot,
        dispose: () => {},
      };
    },
  };
}
