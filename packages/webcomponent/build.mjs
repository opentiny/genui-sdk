import { buildWebComponent, resolveMaterialsSources } from '@opentiny/genui-sdk-build-webcomponent';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

const materials = resolveMaterialsSources(
  ['@opentiny/genui-sdk-materials-vue-opentiny-vue'],
  packageRoot,
);

await buildWebComponent({
  framework: 'vue',
  materials,
  tagName: 'genui-config-renderer',
  outDir: path.join(packageRoot, 'dist'),
  fileName: 'genui-config-renderer',
  minimalExports: true,
});
