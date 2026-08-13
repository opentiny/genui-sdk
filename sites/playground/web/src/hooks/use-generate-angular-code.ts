import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import { generateCode as generateAngularCode } from '@opentiny/genui-sdk-angular';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';

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

const downloadTextFile = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = /\.ts$/i.test(filename) ? filename : `${filename}.ts`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const useExportAngularCode = (meta: IMaterialsMeta = materialsMeta) => {
  const componentsMap = getComponentsMap(meta);

  const exportAngularCode = async (schema: any): Promise<void> => {
    const { panelValue: code, panelName: fileName, errors } = await generateAngularCode({
      pageInfo: { schema },
      formatWithPrettier: true,
    });

    if (errors?.length) {
      console.error('生成代码校验出错：', errors);
    }

    downloadTextFile(fileName, code);
  };

  return {
    exportAngularCode,
  };
};
