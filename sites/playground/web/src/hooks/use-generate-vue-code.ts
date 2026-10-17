import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import { generateCode as generateVueCode } from '@opentiny/genui-sdk-vue/code-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { runCodeExport } from '../utils';

type IComponentMapItem = {
  componentName: string;
  pkg: string;
  package: string;
  exportName: string;
};

const generateComponentsMap = (materialsList: IMaterialsProtocol[] | undefined): IComponentMapItem[] => {
  if (!Array.isArray(materialsList)) {
    return [];
  }

  const deduped = new Map<string, IComponentMapItem>();
  materialsList.forEach((material) => {
    const components = material?.data?.materials?.components;
    if (!Array.isArray(components)) {
      return;
    }
    components.forEach((item) => {
      const componentName = item?.component || item?.npm?.exportName;
      const pkg = item?.npm?.package;
      if (!componentName || !pkg) {
        return;
      }
      deduped.set(componentName, {
        componentName,
        pkg,
        package: pkg,
        exportName: item?.npm?.exportName || componentName,
      });
    });
  });

  return [...deduped.values()];
};

const componentsMapCache = new WeakMap<object, IComponentMapItem[]>();

const getComponentsMap = (meta?: IMaterialsMeta) => {
  if (!meta) {
    return generateComponentsMap(undefined);
  }
  let map = componentsMapCache.get(meta);
  if (!map) {
    map = generateComponentsMap(meta.materials);
    componentsMapCache.set(meta, map);
  }
  return map;
};

export const useExportVueCode = (meta: IMaterialsMeta = materialsMeta) => {
  const componentsMap = getComponentsMap(meta);

  const exportVueCode = (schema: any) =>
    runCodeExport(
      () =>
        generateVueCode({
          pageInfo: { schema },
          componentsMap,
          formatWithPrettier: true,
        }),
      'SchemaCard.vue',
      '.vue',
    );

  return {
    exportVueCode,
  };
};
