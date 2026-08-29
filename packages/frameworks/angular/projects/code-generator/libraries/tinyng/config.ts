import type { NodeSchema } from '@opentiny/genui-sdk-core';
import type { IAngularLibraryConfig } from '../../types';
import { componentSelector, moduleRefMap, componentExtraSelector, libraryComponents } from './map';
import { TINY_NG_PROP_ADAPTERS } from './prop-adapters';

/**
 * TinyNG 组件库专属配置:映射表来自物料包推导(map.ts),prop 特判来自适配器列表(prop-adapters.ts)。
 * 组件库差异全部收敛为纯配置/策略,注册到 AngularCodeGeneratorBase.libraries 类内注册表(见 angular-code-generator-base.ts),
 * 无需为每个库新增子类。
 */
export const TINYNG_CONFIG: IAngularLibraryConfig = {
  componentSelector,
  moduleRefMap,
  libraryPackage: '@opentiny/ng',
  componentExtraSelector,
  extraVoidElements: ['ti-image'],
  propBlacklist: { TiTable: ['border', 'stripe'] },
  propRename: { TiPagination: { total: 'totalNumber' } },
  propAdapters: TINY_NG_PROP_ADAPTERS,
  libraryComponents,

  /** TiTable 的 srcData.state 缺省字段补全(表格声明式搜索/排序/分页需要) */
  transformState: (state) => {
    const srcState = (() => {
      const srcData = state['srcData'];
      if (!srcData || typeof srcData !== 'object' || Array.isArray(srcData)) return undefined;
      const inner = (srcData as Record<string, unknown>)['state'];
      return inner && typeof inner === 'object' && !Array.isArray(inner)
        ? (inner as Record<string, unknown>)
        : undefined;
    })();

    if (srcState) {
      const defaults = { searched: false, sorted: false, paginated: false };
      for (const [key, value] of Object.entries(defaults)) {
        if (srcState[key] === undefined) srcState[key] = value;
      }
    }
  },

  /** TiFormField 的直接子节点统一包装为 TiItem(库的表单布局约定) */
  transformChildren: (componentName, children) => {
    if (componentName === 'TiFormField' && Array.isArray(children)) {
      return children.map((child) => {
        const childSchema = child as NodeSchema;
        if (childSchema.componentName === 'TiItem') {
          return childSchema;
        }
        return { componentName: 'TiItem', children: [childSchema] } as NodeSchema;
      });
    }
    return undefined;
  },
};
