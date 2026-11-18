import { type IMaterialsMeta } from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';

export type BenchFrameworkKey = 'Vue' | 'Angular';
export type BenchMaterialsVariant = 'mini' | 'standard';

const metaMap: Record<BenchFrameworkKey, IMaterialsMeta> = {
  Vue: materialsMeta,
  Angular: ngMaterialsMeta,
};

let warnedAngularMini = false;

/**
 * 选用 materials 包导出的 meta（与 core / chat-completions 用法一致）。
 * Vue `mini` → `miniMaterialsMeta`；其余 → 对应框架的 `materialsMeta`。
 * Angular 暂无 `mini` 变体：不静默回退，首次遇到时打印一次性警告。
 */
export function resolveMaterialsMeta(
  framework: BenchFrameworkKey = 'Vue',
  materialsVariant: BenchMaterialsVariant = 'standard',
): IMaterialsMeta {
  if (framework === 'Vue' && materialsVariant === 'mini') {
    return miniMaterialsMeta;
  }
  if (framework === 'Angular' && materialsVariant === 'mini' && !warnedAngularMini) {
    warnedAngularMini = true;
    console.warn(
      '[benchmarks] Angular does not provide a "mini" materials variant; ' +
        'falling back to the standard Angular materials meta.',
    );
  }
  return metaMap[framework] ?? materialsMeta;
}
