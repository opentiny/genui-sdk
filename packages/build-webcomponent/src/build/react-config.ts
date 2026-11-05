import type { InlineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createBaseViteConfig, type AliasEntry, type BaseViteConfigOptions } from './base-config';

export interface WebComponentBuildConfigOptions
  extends Omit<BaseViteConfigOptions, 'frameworkPlugins' | 'alias' | 'dedupe'> {
  /** 把 react / react-dom 强制解析到该目录并去重，保证产物里只有一份 React */
  reactDir?: string;
  reactDomDir?: string;
}

export function createWebComponentViteConfig(options: WebComponentBuildConfigOptions): InlineConfig {
  const { reactDir, reactDomDir, ...base } = options;

  const alias: AliasEntry[] = reactDir
    ? [
        ...(reactDomDir
          ? [
              { find: /^react-dom$/, replacement: reactDomDir },
              { find: /^react-dom\/(.*)$/, replacement: `${reactDomDir}/$1` },
            ]
          : []),
        { find: /^react$/, replacement: reactDir },
        // 预编译产物会 import react/jsx-runtime，必须一起收敛到同一份 React
        { find: /^react\/(.*)$/, replacement: `${reactDir}/$1` },
      ]
    : [];

  return createBaseViteConfig({
    ...base,
    alias,
    dedupe: reactDir ? ['react', 'react-dom'] : [],
    frameworkPlugins: react(),
  });
}
