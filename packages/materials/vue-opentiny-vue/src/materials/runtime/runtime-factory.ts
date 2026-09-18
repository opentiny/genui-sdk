import type { IThemeDescriptor, MaterialsRuntimeFactory, ThemeColorScheme } from '@opentiny/genui-sdk-core';
import { use as tinyUse, zhCN as tinyZhCN, enUS as tinyEnUS } from '@opentiny/vue-locale';
import { defineComponent, h, ref } from 'vue';
import RuntimeRoot from './RuntimeRoot.vue';

const ZH_CN = 'zh_CN';

const themes: IThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
  { id: 'lite', colorScheme: 'light' },
];

function resolveDescriptor(theme: string, systemColorScheme: ThemeColorScheme): IThemeDescriptor {
  return (
    themes.find((item) => item.id === theme) ?? {
      id: systemColorScheme,
      colorScheme: systemColorScheme,
    }
  );
}

export const runtimeFactory: MaterialsRuntimeFactory = () => {
  const theme = ref('light');
  const root = defineComponent({
    name: 'GenuiOpenTinyRuntimeRoot',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h(RuntimeRoot, { theme: theme.value, ...attrs }, slots);
    },
  });

  return {
    themes,
    root,
    apply(config, context) {
      const descriptor = resolveDescriptor(config.theme, context.systemColorScheme);
      theme.value = descriptor.id;
      tinyUse(config.locale.trim() === ZH_CN ? tinyZhCN : tinyEnUS);
      return { theme: descriptor };
    },
  };
};
