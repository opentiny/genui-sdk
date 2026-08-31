import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeColorScheme,
  type ThemeDescriptor,
} from '@opentiny/genui-sdk-core';
import { defineComponent, h, ref } from 'vue';

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

export function createElementPlusMaterialsTheme(): IMaterialsTheme {
  // 每个实例独立的状态与 Root（工厂每被调用一次即得到一套，供单个使用方独占）
  const dark = ref(false);
  const Root = defineComponent({
    name: 'ElementPlusThemeRoot',
    setup(_, { slots }) {
      return () =>
        h('div', { class: { dark: dark.value }, style: { height: '100%' } }, slots.default?.());
    },
  });

  return {
    themes,
    apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const descriptor = resolveDescriptor(theme, ctx.systemColorScheme);
      // 只更新本实例状态，Root 类型保持不变，避免子树重挂载
      dark.value = descriptor.colorScheme === 'dark';
      return { descriptor, Root, dispose: () => {} };
    },
  };
}
