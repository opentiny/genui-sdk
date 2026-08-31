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

export function createTheme(): IMaterialsTheme {

  const theme = ref('light');
  const Root = defineComponent({
    name: 'ElementPlusThemeRoot',
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
        dispose: () => {
          theme.value = 'light';
        },
      };
    },
  };
}
