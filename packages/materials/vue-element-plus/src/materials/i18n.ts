import { defineComponent, h } from 'vue';
import type { IMaterialsI18n } from '@opentiny/genui-sdk-core';
import { ElConfigProvider } from 'element-plus';
import elementPlusZhCn from 'element-plus/es/locale/lang/zh-cn';
import elementPlusEn from 'element-plus/es/locale/lang/en';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { shallowRef } from 'vue';

const ZH_CN = 'zh_CN';

export const epLocale = shallowRef(elementPlusZhCn);

function setLocale(locale: string): void {
  const lang = locale.trim();
  if (lang === ZH_CN) {
    epLocale.value = elementPlusZhCn;
    dayjs.locale('zh-cn');
    return;
  }
  epLocale.value = elementPlusEn;
  dayjs.locale('en');
}

export const LocaleProvider = defineComponent({
  name: 'GenuiElementPlusLocaleProvider',
  setup(_, { slots }) {
    return () =>
      h(
        ElConfigProvider,
        // Read .value during render so locale switches re-render the provider.
        { locale: epLocale.value },
        { default: () => slots.default?.() },
      );
  },
});

export const materialsI18n: IMaterialsI18n = {
  setLocale,
  LocaleProvider,
};
