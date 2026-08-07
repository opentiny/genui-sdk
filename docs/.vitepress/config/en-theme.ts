import type { DefaultTheme } from 'vitepress';

export const enThemeConfig: DefaultTheme.Config = {
  outline: {
    level: [2, 3],
    label: 'On this page',
  },
  nav: [
    { text: 'Quick Start', link: '/en/guide/quick-start', activeMatch: '/en/guide/' },
    { text: 'Reference', link: '/en/components/renderer', activeMatch: '/en/components/' },
    {
      text: 'Examples',
      link: '/en/examples/renderer/custom-actions',
      activeMatch: '/en/examples/',
    },
    { text: 'Protocol', link: '/en/schema/protocol', activeMatch: '/en/schema/' },
  ],
  sidebar: {
    '/en/guide/': [
      {
        text: 'GenUI SDK Vue Guide',
        items: [
          { text: 'Quick Start', link: '/en/guide/quick-start' },
          { text: 'Using Renderer', link: '/en/guide/start-with-renderer' },
        ],
      },
      {
        text: 'GenUI SDK Angular Guide',
        items: [
          { text: 'Install & Setup', link: '/en/guide/angular/install' },
          { text: 'Using Renderer', link: '/en/guide/angular/start-with-renderer' },
        ],
      },
      {
        text: 'GenUI SDK React Guide',
        items: [
          { text: 'Install & Setup', link: '/en/guide/react/install' },
          { text: 'Using Renderer', link: '/en/guide/react/start-with-renderer' },
        ],
      },
      {
        text: 'GenUI SDK Server Guide',
        items: [{ text: 'Server Usage', link: '/en/guide/server-usage' }],
      },
    ],
    '/en/components/': [
      {
        text: 'Vue Components',
        items: [
          { text: 'GenuiRenderer', link: '/en/components/renderer' },
          { text: 'GenuiChat', link: '/en/components/chat' },
          { text: 'GenuiConfigProvider', link: '/en/components/config-provider' },
        ],
      },
      {
        text: 'Angular Components',
        items: [{ text: 'GenuiRenderer', link: '/en/components/angular/renderer' }],
      },
      {
        text: 'React Components',
        items: [
          { text: 'GenuiRenderer', link: '/en/components/react/renderer' },
          { text: 'GenuiConfigProvider', link: '/en/components/react/config-provider' },
        ],
      },
      {
        text: 'Server',
        items: [
          { text: 'API Reference', link: '/en/components/server/api' },
          { text: 'CLI', link: '/en/components/server/cli' },
        ],
      },
      {
        text: 'Core',
        items: [{ text: 'API Docs', link: '/en/components/core/api' }],
      },
      {
        text: 'Materials',
        items: [
          { text: 'Vue OpenTiny Vue', link: '/en/components/materials/vue-opentiny-vue' },
          { text: 'Vue Element Plus', link: '/en/components/materials/vue-element-plus' },
          { text: 'Angular OpenTiny NG', link: '/en/components/materials/angular-opentiny-ng' },
          { text: 'React Ant Design', link: '/en/components/materials/react-antd' },
        ],
      },
    ],
    '/en/examples/': [
      {
        text: 'Vue Examples',
        items: [
          {
            text: 'Renderer',
            items: [
              { text: 'Custom Actions', link: '/en/examples/renderer/custom-actions' },
              { text: 'Custom Components', link: '/en/examples/renderer/custom-components' },
              {
                text: 'Buffer Field Selectors',
                link: '/en/examples/renderer/required-complete-field-selectors',
              },
              { text: 'Merged State', link: '/en/examples/renderer/state' },
            ],
          },
          {
            text: 'Chat',
            items: [
              { text: 'Custom Actions', link: '/en/examples/chat/custom-actions' },
              { text: 'Custom Components', link: '/en/examples/chat/custom-components' },
              { text: 'Custom Snippets', link: '/en/examples/chat/custom-snippets' },
              { text: 'Custom Examples', link: '/en/examples/chat/custom-examples' },
              { text: 'Footer Toolbar', link: '/en/examples/chat/footer-toolbar' },
              { text: 'Thinking Process', link: '/en/examples/chat/thinking-process' },
              { text: 'Custom Fetch', link: '/en/examples/chat/custom-fetch' },
              { text: 'Image Upload', link: '/en/examples/chat/image-upload' },
              { text: 'Chat History', link: '/en/examples/chat/history' },
            ],
          },
          {
            text: 'ConfigProvider',
            items: [
              { text: 'Theme Switch', link: '/en/examples/config-provider/theme' },
              { text: 'Custom Theme', link: '/en/examples/config-provider/custom-theme' },
              { text: 'i18n', link: '/en/examples/config-provider/i18n' },
            ],
          },
        ],
      },
      {
        text: 'Angular Examples',
        items: [
          {
            text: 'Renderer',
            items: [
              { text: 'Custom Actions', link: '/en/examples/angular/renderer/custom-actions' },
              {
                text: 'Buffer Field Selectors',
                link: '/en/examples/angular/renderer/required-complete-field-selectors',
              },
              { text: 'Merged State', link: '/en/examples/angular/renderer/state' },
            ],
          },
        ],
      },
    ],
  },
};
