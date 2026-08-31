import type { NodeSchema } from '@opentiny/genui-sdk-core';
import type { IAngularLibraryConfig } from '../../types';
import { componentSelector, moduleRefMap, componentExtraSelector, libraryComponents } from './map';
import { TINY_NG_PROP_ADAPTERS } from './prop-adapters';

/**
 * TinyNG 组件库专属配置:映射表来自物料包推导(map.ts),prop 特判来自适配器列表(prop-adapters.ts)。
 * 组件库差异全部收敛为纯配置/策略,注册到 AngularCodeGenerator.libraries 类内注册表(见 angular-code-generator.ts),
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

  /** TiTable 的 srcData.state 归一化:字符串("paginated" 等)转为 TiTableSrcState 对象,对象形式补全缺省字段 */
  transformState: (state) => {
    const srcData = state['srcData'];
    if (!srcData || typeof srcData !== 'object' || Array.isArray(srcData)) {
      return;
    }
    const srcDataRecord = srcData as Record<string, unknown>;
    const inner = srcDataRecord['state'];
    const defaults = { paginated: false, searched: false, sorted: false };

    // TinyNG 要求 srcData.state 是 TiTableSrcState 对象或 undefined;AI 常输出字符串(如 "paginated"),
    // 字符串表示启用的声明式特性(可逗号/空格组合),转为对象形式,命中的特性置 true,其余 false
    if (typeof inner === 'string') {
      const normalized: Record<string, boolean> = { ...defaults };
      inner
        .split(/[, ]+/)
        .filter(Boolean)
        .forEach((mode) => {
          if (mode in defaults) normalized[mode] = true;
        });
      srcDataRecord['state'] = normalized;
      return;
    }

    // 对象形式:补全缺失字段为 false(表格声明式搜索/排序/分页需要)
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const srcState = inner as Record<string, unknown>;
      for (const [key, value] of Object.entries(defaults)) {
        if (srcState[key] === undefined) srcState[key] = value;
      }
    }
  },

  /**
   * TiFormField 的直接子节点统一包装为 TiItem(库的表单布局约定);
   * 同时把 TiItem 的 label 属性剥离为第一个子元素 <ti-item-label>(见 record.md:
   * TiItemComponent.setItemLabel 在视图创建期调用 detectChanges() 触发 Angular 20 断言崩溃)。
   */
  transformChildren: (componentName, children) => {
    if (componentName === 'TiFormField' && Array.isArray(children)) {
      return children.map((child) => {
        const childSchema = child as NodeSchema;
        const item: NodeSchema =
          childSchema.componentName === 'TiItem'
            ? childSchema
            : ({ componentName: 'TiItem', children: [childSchema] } as NodeSchema);

        const props = item.props as Record<string, unknown> | undefined;
        const label = props?.label;
        if (label !== undefined) {
          delete props!.label;
          const labelNode: NodeSchema = { componentName: 'TiItemLabel', children: String(label) };
          if (Array.isArray(item.children)) {
            item.children = [labelNode, ...item.children];
          } else if (typeof item.children === 'string') {
            item.children = [labelNode, { componentName: 'Text', props: { text: item.children } }];
          } else {
            item.children = [labelNode];
          }
        }
        return item;
      });
    }
    return undefined;
  },
};
