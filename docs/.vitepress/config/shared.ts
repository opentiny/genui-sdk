import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'vitepress';
import react from '@vitejs/plugin-react';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

const docsRoot = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(docsRoot, '../../src');

export const sharedConfig: UserConfig = {
  base: '/genui-sdk-docs/',
  ignoreDeadLinks: true,
  transformPageData(pageData) {
    if (pageData.isNotFound || !pageData.filePath) {
      return;
    }

    try {
      const content = fs.readFileSync(path.join(srcDir, pageData.filePath), 'utf-8');
      return {
        // Base64 避免 Markdown 中的 </template> 等字符破坏 VitePress 生成的 SFC
        markdownSource: Buffer.from(content, 'utf-8').toString('base64'),
      };
    } catch {
      return;
    }
  },
  markdown: {
    config(md) {
      md.use(vitepressDemoPlugin);
      md.use(tabsMarkdownPlugin);
    },
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'genui-renderer-ng-element',
      },
    },
  },
  vite: {
    plugins: [react({ include: /\.(jsx|tsx)$/ })],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'antd'],
    },
    server: {
      host: '0.0.0.0',
      open: true,
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny/genui-sdk' }],
    search: {
      provider: 'local',
    },
  },
};
