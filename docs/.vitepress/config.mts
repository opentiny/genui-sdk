import { defineConfig } from 'vitepress';
import { sharedConfig } from './config/shared';
import { zhThemeConfig } from './config/zh-theme';
import { enThemeConfig } from './config/en-theme';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  ...sharedConfig,
  srcDir: 'src',
  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      title: 'GenUI SDK',
      description: 'GenUI SDK 文档',
      themeConfig: zhThemeConfig,
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'GenUI SDK',
      description: 'GenUI SDK Documentation',
      themeConfig: enThemeConfig,
    },
  },
});
