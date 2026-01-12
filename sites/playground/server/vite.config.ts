import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-jsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { viteGitCommitHashPlugin } from 'vite-commit-hash-plugin';

const pkgRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const plugins = [
    tsconfigPaths({
      projects: ['./tsconfig.dev.json'],
    }),
    viteStaticCopy({
      targets: [
        {
          src: '.env.alpha',
          dest: './',
          rename: '.env',
        },
        {
          src: 'alpha-models.json',
          dest: './',
        },
      ],
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
