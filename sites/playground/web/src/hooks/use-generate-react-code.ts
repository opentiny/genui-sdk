import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import { generateCode as generateReactCode } from '@opentiny/genui-sdk-react/code-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';

type IComponentMapItem = {
  componentName: string;
  package: string;
  exportName: string;
};

const generateComponentsMap = (materialsList: IMaterialsProtocol[] | undefined): IComponentMapItem[] => {
  if (!Array.isArray(materialsList)) return [];
  const deduped = new Map<string, IComponentMapItem>();
  materialsList.forEach((material) => {
    const components = material?.data?.materials?.components;
    if (!Array.isArray(components)) return;
    components.forEach((item) => {
      const componentName = item?.component || item?.npm?.exportName;
      const packageName = item?.npm?.package;
      if (!componentName || !packageName) return;
      deduped.set(componentName, {
        componentName,
        package: packageName,
        exportName: item?.npm?.exportName || componentName,
      });
    });
  });
  return [...deduped.values()];
};

const componentsMapCache = new WeakMap<object, IComponentMapItem[]>();

const getComponentsMap = (meta?: IMaterialsMeta): IComponentMapItem[] => {
  if (!meta) return [];
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
  link.download = /\.tsx$/i.test(filename) ? filename : `${filename}.tsx`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const useExportReactCode = (meta: IMaterialsMeta = materialsMeta) => {
  const componentsMap = getComponentsMap(meta);

  const exportReactCode = async (schema: any): Promise<void> => {
    const {
      panelValue: code,
      panelName: fileName,
      errors,
    } = await generateReactCode({
      pageInfo: { schema },
      componentsMap,
      formatWithPrettier: true,
    });

    if (errors.length) console.error('生成 React 代码校验出错：', errors);
    downloadTextFile(fileName, code);
  };

  return { exportReactCode };
};
