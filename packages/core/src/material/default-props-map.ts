import type { IRendererConfig } from '../protocols/render-config';

type DefaultValueMap = Record<string, any>;

export type MaterialDefaultValueMap = Record<string, DefaultValueMap>;

interface IComponentLike {
  component?: string;
  schema?: {
    properties?: any[];
  };
}

interface IMaterialLike {
  data?: {
    materials?: {
      components?: IComponentLike[];
    };
  };
}

const collectPropertyDefaults = (
  items: any[] | undefined,
  parentPath: string[],
  result: DefaultValueMap,
) => {
  items?.forEach((item) => {
    const currentPath = item?.property ? parentPath.concat(item.property) : parentPath;

    if (item?.property && Object.prototype.hasOwnProperty.call(item, 'defaultValue')) {
      result[currentPath.join('.')] = item.defaultValue;
    }

    if (Array.isArray(item?.content)) {
      collectPropertyDefaults(item.content, currentPath, result);
    }

    if (Array.isArray(item?.properties)) {
      collectPropertyDefaults(item.properties, currentPath, result);
    }
  });
};

/**
 * 从渲染物料配置中提取各组件的默认 props 映射表
 *
 * @param rendererConfig - 渲染器配置，从中读取 materialsList
 * @returns 组件名到默认 props 的映射对象
 */
export const buildMaterialDefaultValueMap = (
  rendererConfig: Partial<IRendererConfig> = {},
): MaterialDefaultValueMap => {
  const result: MaterialDefaultValueMap = {};
  const materialsList = rendererConfig.materialsList ?? [];

  materialsList.forEach((material: IMaterialLike) => {
    material?.data?.materials?.components?.forEach((component: IComponentLike) => {
      const componentName = component?.component;
      if (typeof componentName !== 'string') {
        return;
      }

      const defaults: DefaultValueMap = {};
      collectPropertyDefaults(component.schema?.properties, [], defaults);

      if (Object.keys(defaults).length > 0) {
        result[componentName] = defaults;
      }
    });
  });

  return result;
};
