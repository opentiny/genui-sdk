import { defineConfig } from 'vitepress';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'GenUI SDK',
  description: 'GenUI SDK Documentation',
  srcDir: 'src',
  base: '/genui-sdk/',
  ignoreDeadLinks: true,
  markdown: {
    config(md) {
      md.use(vitepressDemoPlugin);
    },
  },
  vite: {
    server: {
      host: '0.0.0.0', // 允许外部访问
      open: true, // 开发时自动打开浏览器
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    outline: {
      level: [2, 3], // 显示 <h2> 和 <h3> 标题
      label: '目录', // 可选，自定义目录标题
    },
    nav: [
      { text: '指引', link: '/guide/installation' },
      { text: 'API', link: '/api/api' },
    
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny/genui-sdk' }],
    search: {
      provider: 'local',
    },
  },
});
