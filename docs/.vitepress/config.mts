import { defineConfig } from 'vitepress';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

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
      md.use(tabsMarkdownPlugin);
    },
  },
  vue:{
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'genui-renderer-ng-element',
      },
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
      { text: '协议规范', link: '/schema/protocol' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'GenUI SDK Vue 指引',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '使用 Renderer 组件', link: '/guide/start-with-renderer' },
            { text: '搭配 TinyRobot 使用', link: '/guide/renderer-with-tiny-robot' },
          ],
        },
        {
          text: 'GenUI SDK Angular 指引',
          items: [
            { text: '安装与配置', link: '/guide/angular/install' },
            { text: '使用 Renderer 组件', link: '/guide/angular/start-with-renderer' },
          ],
        },
        {
          text: 'GenUI SDK Server 指引',
          items: [
            { text: 'Server 包使用文档', link: '/guide/server-usage' },
          ],
        },
      ],
      '/components/': [
        {
          text: 'Vue 组件文档',
          items: [
            { text: 'GenuiRenderer', link: '/components/renderer' },
            { text: 'GenuiChat', link: '/components/chat' },
            { text: 'GenuiConfigProvider', link: '/components/config-provider' },
          ],
        },
        {
          text: 'Angular 组件文档',
          items: [
            { text: 'GenuiRenderer', link: '/components/angular/renderer' }
          ],
        },
        {
          text: 'Server 库文档',
          items: [
            { text: 'API 参考', link: '/components/server/api' },
            { text: 'CLI', link: '/components/server/cli' }
          ],
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
        {
          text: 'Angular 组件特性示例',
          items: [
            {
              text: 'Renderer 组件',
              items: [
                { text: '自定义 Actions', link: '/examples/angular/renderer/custom-actions' },
                { text: '自定义 Components/Directives', link: '/examples/angular/renderer/custom-components-directives' },
                {
                  text: '配置缓冲字段',
                  link: '/examples/angular/renderer/required-complete-field-selectors',
                },
                { text: '传递合并 State', link: '/examples/angular/renderer/state' },
              ],
             },
          ],
        }
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny/genui-sdk' }],
    search: {
      provider: 'local',
    },
  },
});
