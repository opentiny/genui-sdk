import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function bundle({ name, entry, plugins, external }) {
  await build({
    configFile: false,
    root: packageRoot,
    logLevel: 'warn',
    plugins,
    build: {
      lib: {
        entry: path.join(packageRoot, entry),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      outDir: path.join(packageRoot, 'dist/frameworks', name),
      emptyOutDir: true,
      cssCodeSplit: false,
      minify: 'esbuild',
      rollupOptions: {
        external,
        output: { inlineDynamicImports: true, format: 'es' },
      },
    },
  });
  console.log(`[genui web-component] 预编译 ${name} 工厂完成`);
}


function bundleAngular() {
  const tsconfig = path.join(packageRoot, 'src/frameworks/angular/tsconfig.json');
  const angularTypes = path.resolve(packageRoot, '../frameworks/angular/output/dist/index.d.ts');

  if (!existsSync(angularTypes)) {
    console.error(`[genui web-component] 缺少 ${angularTypes}。`);
    console.error('请先构建 @opentiny/genui-sdk-angular（pnpm -F @opentiny/genui-sdk-angular build:lib）。');
    process.exit(1);
  }

  const localBin = path.join(packageRoot, 'node_modules/.bin', process.platform === 'win32' ? 'ngc.cmd' : 'ngc');
  const bin = existsSync(localBin) ? localBin : 'ngc';

  try {
    execFileSync(bin, ['-p', tsconfig], { stdio: 'inherit', cwd: packageRoot });
  } catch {
    console.error('[genui web-component] Angular 工厂预编译失败。');
    process.exit(1);
  }

  const output = path.join(packageRoot, 'dist/frameworks/angular/index.js');
  if (!existsSync(output)) {
    console.error(`[genui web-component] 预编译未生成 ${output}`);
    process.exit(1);
  }

  console.log('[genui web-component] 预编译 angular 工厂完成');
}

await bundle({
  name: 'vue',
  entry: 'src/frameworks/vue/factories.ts',
  plugins: [vue(), cssInjectedByJsPlugin()],
  external: [/^vue(\/|$)/, /^@opentiny\/genui-sdk-/],
});

await bundle({
  name: 'react',
  entry: 'src/frameworks/react/factories.ts',
  plugins: [react()],
  external: [/^react(\/|$)/, /^react-dom(\/|$)/, /^@opentiny\/genui-sdk-/],
});

bundleAngular();
