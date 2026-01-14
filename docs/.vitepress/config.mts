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
      { text: '更多技术栈', link: '/advanced/angular-support' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指引',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '使用 Renderer 组件自由搭配', link: '/guide/start-with-renderer' },
          ],
        },
      ],
      '/components/': [
        {
          text: '组件文档',
          items: [
            { text: 'SchemaRenderer', link: '/components/renderer' },
            { text: 'GenuiChat', link: '/components/chat' },
            { text: 'ConfigProvider', link: '/components/config-provider' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '特性示例',
          items: [
            {
              text: 'Renderer 组件',
              items: [
                { text: '自定义 Actions', link: '/examples/renderer/custom-actions' },
                { text: '自定义 Components', link: '/examples/renderer/custom-components' },
                {
                  text: 'requiredCompleteFieldSelectors',
                  link: '/examples/renderer/required-complete-field-selectors',
                },
                { text: '传递合并 State', link: '/examples/renderer/state' },
              ],
            },
            {
              text: 'Chat 组件',
              items: [
                { text: '自定义 Actions', link: '/examples/chat/custom-actions' },
                { text: '自定义 Components 及 Snippets', link: '/examples/chat/custom-components-snippets' },
                { text: '自定义 Examples', link: '/examples/chat/custom-examples' },
                { text: '自定义底部工具栏', link: '/examples/chat/footer-toolbar' },
                { text: '自定义思考过程', link: '/examples/chat/thinking-process' },
                { text: '上传图片', link: '/examples/chat/image-upload' },
                { text: '历史会话管理', link: '/examples/chat/history' },
                { text: 'customFetch', link: '/examples/chat/custom-fetch' },
              ],
            },
            {
              text: 'ConfigProvider 组件',
              items: [
                { text: '切换主题', link: '/examples/config-provider/theme' },
                { text: '自定义主题', link: '/examples/config-provider/custom-theme' },
              ],
            },
          ],
        },
      ],
      '/advanced/': [
        {
          text: '更多技术栈',
          items: [
            { text: '支持 Angular', link: '/advanced/angular-support' },
            { text: '支持自定义渲染器', link: '/advanced/custom-renderer' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API',
          items: [{ text: 'API 参考', link: '/api/api' }],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny/genui-sdk' }],
    search: {
      provider: 'local',
    },
  },
});
