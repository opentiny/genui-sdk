import type { IMaterialsMeta } from './materials-meta';

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

export const buildMaterialDefaultValueMap = (
  materialsMeta: Partial<IMaterialsMeta> = {},
): MaterialDefaultValueMap => {
  const result: MaterialDefaultValueMap = {};
  const materials = materialsMeta.materials ?? [];

  materials.forEach((material: IMaterialLike) => {
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
