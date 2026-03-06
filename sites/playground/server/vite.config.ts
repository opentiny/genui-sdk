import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-jsconfig-paths';
import { viteStaticCopy, type Target } from 'vite-plugin-static-copy';
import { viteGitCommitHashPlugin } from 'vite-commit-hash-plugin';

const pkgRoot = fileURLToPath(new URL('.', import.meta.url));

const modelsFileMap = {
  alpha: 'alpha-models.json',
  'agent-alpha': 'opentiny-models.json',
  'production': 'opentiny-models.json',
  'default': 'maas-models.json',
};

export default defineConfig(({ mode }) => {
  const envFileName = mode ? `.env.${mode}` : '.env';
  const envFilePath = join(pkgRoot, envFileName);
  const envFileExists = existsSync(envFilePath);

  const modelsFileName = modelsFileMap[mode] || modelsFileMap.default;
  const staticCopyTargets: Target[] = [
    {
      src: modelsFileName,
      dest: './',
    },
  ];
  if (envFileExists) {
    staticCopyTargets.push({
      src: envFileName,
      dest: './',
      rename: '.env',
    });
  }

  const plugins = [
    tsconfigPaths({
      projects: ['./tsconfig.dev.json'],
    }),
    viteStaticCopy({
      targets: staticCopyTargets,
    }),
    viteGitCommitHashPlugin({
      fileName: 'version.json',
    }),
  ];

  return {
    root: pkgRoot,
    plugins,
    build: {
      ssr: true,
      target: 'node18',
      outDir: fileURLToPath(new URL('./dist', import.meta.url)),
      emptyOutDir: true,
      esbuild: {
        platform: 'node',
      },
      rollupOptions: {
        input: fileURLToPath(new URL('./index.ts', import.meta.url)),
        output: {
          format: 'esm',
          entryFileNames: 'index.mjs',
          chunkFileNames: 'chunks/[name]-[hash].mjs',
          inlineDynamicImports: true,
        },
        external: [],
      },
    },
    ssr: {
      noExternal: true,
    },
  };
});
