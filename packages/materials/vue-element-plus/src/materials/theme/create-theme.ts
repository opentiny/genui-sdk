import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeColorScheme,
  type ThemeDescriptor,
} from '@opentiny/genui-sdk-core';
import { defineComponent, h } from 'vue';
import 'element-plus/theme-chalk/dark/css-vars.css';

const themes: ThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
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

// element-plus 暗色基于全局 html.dark，暗色 css 直接从 element-plus 引入并打包进物料
export function createTheme(): IMaterialsTheme {
  const Root = defineComponent({
    name: 'ElementPlusThemeRoot',
    setup(_, { slots }) {
      return () => h('div', { style: { height: '100%' } }, slots.default?.());
    },
  });

  return {
    themes,
    apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const descriptor = resolveDescriptor(theme, ctx.systemColorScheme);
      document.documentElement.classList.toggle('dark', descriptor.colorScheme === 'dark');
      return {
        descriptor,
        Root,
        dispose: () => {
          document.documentElement.classList.remove('dark');
        },
      };
    },
  };
}
