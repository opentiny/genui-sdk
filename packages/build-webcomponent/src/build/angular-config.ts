import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
// @ts-expect-error @babel/core ships no type declarations of its own
import { transformAsync } from '@babel/core';
import { createEs2015LinkerPlugin } from '@angular/compiler-cli/linker/babel';
import type { InlineConfig, Plugin } from 'vite';
import { createBaseViteConfig, type BaseViteConfigOptions } from './base-config';

/**
 * 只认「调用」形式：`ɵɵngDeclareComponent({ ... })`。
 * `@angular/core` 自身也定义了 `function ɵɵngDeclareXxx(decl)`，那是 JIT 兼容垫片，不能当成分部声明。
 */
const PARTIAL_DECLARATION_CALL = /ɵɵngDeclare[A-Za-z]+\(\{/;

/** linker 只用到极少几个文件系统能力，这里用 node:fs 直接实现 */
const linkerFileSystem = {
  resolve: (...segments: string[]) => path.resolve(...segments),
  exists: (fileName: string) => existsSync(fileName),
  readFile: (fileName: string) => readFileSync(fileName, 'utf-8'),
  dirname: (fileName: string) => path.dirname(fileName),
  relative: (from: string, to: string) => path.relative(from, to),
  normalize: (fileName: string) => path.normalize(fileName),
  isRoot: (fileName: string) => path.dirname(fileName) === fileName,
} as never;

const linkerLogger = {
  level: 1,
  debug: (...args: unknown[]) => console.debug('[angular-linker]', ...args),
  info: (...args: unknown[]) => console.info('[angular-linker]', ...args),
  warn: (...args: unknown[]) => console.warn('[angular-linker]', ...args),
  error: (...args: unknown[]) => console.error('[angular-linker]', ...args),
};

/**
 * Third-party Angular libraries (`@opentiny/ng-*`, `@opentiny/ng`) ship partial-Ivy
 * output full of `ɵɵngDeclareComponent` declarations. They only run after the Angular
 * linker rewrites them into `ɵɵdefineComponent`. Angular CLI does that automatically;
 * this Vite pipeline has to attach the linker itself, or the bundle fails in the
 * browser with `ɵɵngDeclareComponent is not a function`.
 */
export function createAngularLinkerPlugin(): Plugin {
  return {
    name: 'genui-angular-linker',
    enforce: 'pre',
    async transform(code, id) {
      // @angular/compiler 只有定义没有调用，跳过可以省掉一次超大文件的解析
      if (!PARTIAL_DECLARATION_CALL.test(code) || id.includes('/@angular/compiler/')) return null;

      const result = await transformAsync(code, {
        filename: id,
        sourceMaps: true,
        sourceFileName: id,
        babelrc: false,
        configFile: false,
        browserslistConfigFile: false,
        compact: false,
        sourceType: 'module',
        plugins: [createEs2015LinkerPlugin({ fileSystem: linkerFileSystem, logger: linkerLogger })],
      });

      if (!result?.code) return null;
      if (process.env.GENUI_LINKER_DEBUG) console.log('[linker] linked', id);
      return { code: result.code, map: result.map as never };
    },
  };
}

export interface WebComponentBuildConfigOptions extends Omit<BaseViteConfigOptions, 'frameworkPlugins'> {}

const DEFAULT_DEDUPE = ['@angular/core', '@angular/common', 'rxjs', 'zone.js', '@opentiny/ng'];

export function createWebComponentViteConfig(options: WebComponentBuildConfigOptions): InlineConfig {
  const { dedupe = DEFAULT_DEDUPE, alias = [], plugins = [], ...base } = options;

  return createBaseViteConfig({
    ...base,
    alias,
    dedupe,
    plugins: [...plugins, createAngularLinkerPlugin()],
    chunkSizeWarningLimit: options.chunkSizeWarningLimit ?? 4000,
  });
}
