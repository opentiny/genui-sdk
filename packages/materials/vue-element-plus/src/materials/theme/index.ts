import {
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeColorScheme,
  type ThemeDescriptor,
} from '@opentiny/genui-sdk-core';
import { defineComponent, h, ref } from 'vue';

const darkFlag = ref(false);

const ElementPlusThemeRoot = defineComponent({
  name: 'ElementPlusThemeRoot',
  setup(_, { slots }) {
    return () =>
      h('div', { class: { dark: darkFlag.value }, style: { height: '100%' } }, slots.default?.());
  },
});

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
  return {
    themes,
    apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult {
      const descriptor = resolveDescriptor(theme, ctx.systemColorScheme);
      // dark 状态写入模块级 ref，Root 渲染时按需打 class（副作用收拢在 Root，apply 无 DOM 副作用）
      darkFlag.value = descriptor.colorScheme === 'dark';
      return {
        descriptor,
        Root: ElementPlusThemeRoot,
        dispose: () => {},
      };
    },
  };
}
