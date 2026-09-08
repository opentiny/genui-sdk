import type { IMaterialsI18n } from '@opentiny/genui-sdk-core';
import { use as tinyUse, zhCN as tinyZhCN, enUS as tinyEnUS } from '@opentiny/vue-locale';

const ZH_CN = 'zh_CN';

export const materialsI18n: IMaterialsI18n = {
  setLocale(locale: string) {
    const lang = locale.trim();
    if (lang === ZH_CN) {
      tinyUse(tinyZhCN);
      return;
    }
    tinyUse(tinyEnUS);
  },
};
