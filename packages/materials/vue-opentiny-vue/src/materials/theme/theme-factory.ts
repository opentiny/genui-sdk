import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeColorScheme,
  type ThemeDescriptor,
} from '@opentiny/genui-sdk-core';
import { defineComponent, h, ref } from 'vue';
import ThemeRoot from './ThemeRoot.vue';

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

export function themeFactory(): IMaterialsTheme {
  // 框架渲染 Root 时不传 props，主题通过闭包 ref 传入，Root 类型保持不变避免子树重挂载
  const theme = ref('light');
  const Root = defineComponent({
    name: 'OpenTinyThemeRoot',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h(ThemeRoot, { theme: theme.value, ...attrs }, slots);
    },
  });

  return {
    themes,
    apply(themeValue: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const descriptor = resolveDescriptor(themeValue, ctx.systemColorScheme);
      theme.value = descriptor.id;
      return {
        descriptor,
        Root,
        dispose: () => {},
      };
    },
  };
}
