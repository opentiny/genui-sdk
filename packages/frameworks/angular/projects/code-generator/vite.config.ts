import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const MATERIALS_CODEGEN_SRC = fileURLToPath(
  new URL('../../../../materials/angular-opentiny-ng/src/code-generator/index.ts', import.meta.url),
);

export default defineConfig({
  root: 'src/gen-page',
  resolve: {
    alias: [
      {
        find: '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator',
        replacement: MATERIALS_CODEGEN_SRC,
      },
    ],
  },
  server: {
    port: 5175,
    strictPort: true,
  },
});
