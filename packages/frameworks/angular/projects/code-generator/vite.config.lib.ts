import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from '../../package.json';

export default defineConfig({
  root: path.resolve(__dirname, './'),
  plugins: [
    dts({
      rollupTypes: true,
      tsconfigPath: path.resolve(__dirname, './tsconfig.lib.json'),
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, './index.ts'),
      formats: ['es'],
      fileName: 'code-generator',
    },
    outDir: path.resolve(__dirname, '../../output/dist'),
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      // @angular/compiler / prettier 等由宿主提供,别打进 35KB 的出码器里
      external: Object.keys(packageJson.dependencies || {}).map(
        (name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`),
      ),
    },
  },
});
