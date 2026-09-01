import { type IMaterialsMeta } from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';

export type BenchFrameworkKey = 'Vue' | 'Angular';
export type BenchMaterialsVariant = 'mini' | 'standard';

const metaMap: Record<BenchFrameworkKey, IMaterialsMeta> = {
  Vue: materialsMeta,
  Angular: ngMaterialsMeta,
};

/**
 * 选用 materials 包导出的 meta（与 core / chat-completions 用法一致）。
 * Vue `mini` → `miniMaterialsMeta`；其余 → 对应框架的 `materialsMeta`。
 */
export function resolveMaterialsMeta(
  framework: BenchFrameworkKey = 'Vue',
  materialsVariant: BenchMaterialsVariant = 'standard',
): IMaterialsMeta {
  if (framework === 'Vue' && materialsVariant === 'mini') {
    return miniMaterialsMeta;
  }
  return metaMap[framework] ?? materialsMeta;
}
