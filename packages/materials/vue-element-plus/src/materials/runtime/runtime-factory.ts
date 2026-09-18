import type { IThemeDescriptor, MaterialsRuntimeFactory, ThemeColorScheme } from '@opentiny/genui-sdk-core';
import { defineComponent, h, ref, shallowRef } from 'vue';
import type { Language } from 'element-plus/es/locale';
import elementPlusZhCn from 'element-plus/es/locale/lang/zh-cn';
import elementPlusEn from 'element-plus/es/locale/lang/en';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import RuntimeRoot from './RuntimeRoot.vue';

const ZH_CN = 'zh_CN';

const themes: IThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
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
  const locale = shallowRef<Language>(elementPlusZhCn);
  const root = defineComponent({
    name: 'GenuiElementPlusRuntimeRoot',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h(RuntimeRoot, { theme: theme.value, locale: locale.value, ...attrs }, slots);
    },
  });

  return {
    themes,
    root,
    apply(config, context) {
      const descriptor = resolveDescriptor(config.theme, context.systemColorScheme);
      theme.value = descriptor.id;

      if (config.locale.trim() === ZH_CN) {
        locale.value = elementPlusZhCn;
        dayjs.locale('zh-cn');
      } else {
        locale.value = elementPlusEn;
        dayjs.locale('en');
      }

      return { theme: descriptor };
    },
  };
};
