import {
  type IMaterialsTheme,
  type IThemeApplyContext,
  type IThemeApplyResult,
  type ThemeColorScheme,
  type IThemeDescriptor,
} from '@opentiny/genui-sdk-core';
import { defineComponent, h, ref } from 'vue';
import ThemeRoot from './ThemeRoot.vue';

const themes: IThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
  { id: 'lite', colorScheme: 'light' },
];

function resolveDescriptor(
  theme: string,
  systemColorScheme: ThemeColorScheme,
): IThemeDescriptor {
  return (
    themes.find((item) => item.id === theme) ?? {
      id: systemColorScheme,
      colorScheme: systemColorScheme,
    }
  );
}

export function themeFactory(): IMaterialsTheme {
  // 框架渲染 root 时不传 props，主题通过闭包 ref 传入，root 类型保持不变避免子树重挂载
  const theme = ref('light');
  const root = defineComponent({
    name: 'OpenTinyThemeRoot',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h(ThemeRoot, { theme: theme.value, ...attrs }, slots);
    },
  });

  return {
    themes,
    apply(themeValue: string, ctx: IThemeApplyContext): IThemeApplyResult {
      const descriptor = resolveDescriptor(themeValue, ctx.systemColorScheme);
      theme.value = descriptor.id;
      return {
        descriptor,
        root,
        dispose: () => {},
      };
    },
  };
}
