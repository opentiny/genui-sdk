import type { IMaterials } from './materials';

export function mergeMaterials(...list: IMaterials[]): IMaterials {
  const result: IMaterials = {
    components: {},
    defaultPropsMap: {},
    requiredCompleteFieldSelectors: [],
  };

  for (const item of list) {
    if (!item) continue;
    Object.assign(result.components!, item.components ?? {});
    Object.assign(result.defaultPropsMap!, item.defaultPropsMap ?? {});
    result.requiredCompleteFieldSelectors!.push(
      ...(item.requiredCompleteFieldSelectors ?? []),
    );
  }

  return result;
}