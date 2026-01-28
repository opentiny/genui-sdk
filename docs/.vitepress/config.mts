import { defineConfig } from 'vitepress';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'GenUI SDK',
  description: 'GenUI SDK Documentation',
  srcDir: 'src',
  base: '/genui-sdk-docs/',
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
      { text: '快速开始', link: '/guide/quick-start' },
      { text: '组件文档', link: '/components/renderer' },
      { text: '特性示例', link: '/examples/renderer/custom-actions' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指引',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '使用 Renderer 组件', link: '/guide/start-with-renderer' },
            { text: '搭配 TinyRobot 使用', link: '/guide/renderer-with-tiny-robot' },
          ],
        },
      ],
      '/components/': [
        {
          text: 'Vue组件文档',
          items: [
            { text: 'GenuiRenderer', link: '/components/renderer' },
            { text: 'GenuiChat', link: '/components/chat' },
            { text: 'GenuiConfigProvider', link: '/components/config-provider' },
          ],
        },
        {
          text: 'Angular组件文档',
          items: [{ text: 'GenuiRenderer(未开放)', link: '/components/angular-renderer' }],
        },
      ],
      '/examples/': [
        {
          text: 'Vue组件特性示例',
          items: [
            {
              text: 'Renderer 组件',
              items: [
                { text: '自定义 Actions', link: '/examples/renderer/custom-actions' },
                { text: '自定义 Components', link: '/examples/renderer/custom-components' },
                {
                  text: '配置缓冲字段',
                  link: '/examples/renderer/required-complete-field-selectors',
                },
                { text: '传递合并 State', link: '/examples/renderer/state' },
              ],
            },
            {
              text: 'Chat 组件',
              items: [
                { text: '自定义 Actions', link: '/examples/chat/custom-actions' },
                { text: '自定义 Components', link: '/examples/chat/custom-components' },
                { text: '自定义 Snippets', link: '/examples/chat/custom-snippets' },
                { text: '自定义 Examples', link: '/examples/chat/custom-examples' },
                { text: '自定义底部工具栏', link: '/examples/chat/footer-toolbar' },
                { text: '自定义思考过程', link: '/examples/chat/thinking-process' },
                { text: '自定义 Fetch', link: '/examples/chat/custom-fetch' },
                { text: '上传图片', link: '/examples/chat/image-upload' },
                { text: '历史会话管理', link: '/examples/chat/history' },
              ],
            },
            {
              text: 'ConfigProvider 组件',
              items: [
                { text: '切换主题', link: '/examples/config-provider/theme' },
                { text: '自定义主题', link: '/examples/config-provider/custom-theme' },
                { text: '国际化配置', link: '/examples/config-provider/i18n' },
              ],
            },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny/genui-sdk' }],
    search: {
      provider: 'local',
    },
  },
});
