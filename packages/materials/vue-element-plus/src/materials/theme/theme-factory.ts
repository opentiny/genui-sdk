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
    apply(themeValue: string, ctx: IThemeApplyContext): IThemeApplyResult {
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
