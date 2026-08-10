import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import type { UserConfig } from 'vitepress';
import tsconfigPaths from 'vite-jsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

const docsRoot = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(docsRoot, '../../src');

function serveOnly(plugin: Plugin): Plugin {
  return { ...plugin, apply: 'serve' };
}

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
    plugins: [
      serveOnly(
        tsconfigPaths({
          projects: [path.resolve(docsRoot, '../../tsconfig.dev.json')],
        }),
      ),
      serveOnly(nodePolyfills()),
    ],
    server: {
      host: '0.0.0.0',
      port: 8100,
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
