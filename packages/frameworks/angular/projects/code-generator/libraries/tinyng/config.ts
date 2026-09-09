import type { NodeSchema } from '@opentiny/genui-sdk-core';
import type { IAngularLibraryConfig } from '../../types';
import { componentSelector, moduleRefMap, componentExtraSelector, libraryComponents } from './map';

/**
 * TinyNG 组件库专属配置:映射表来自物料包推导(map.ts)。
 * 组件库差异全部收敛为纯配置/策略,注册到 AngularCodeGenerator.libraries 类内注册表(见 angular-code-generator.ts)。
 * 说明:prop 形态类特判(如 TiPagination 的 pageSize 对象)已在物料包 meta/示例中直接写对,不再需要 propAdapters,
 * 故本库不再配置该项(prop-adapter.ts 抽象保留给未来确有形态重塑需求的组件库)。
 */
export const TINYNG_CONFIG: IAngularLibraryConfig = {
  componentSelector,
  moduleRefMap,
  libraryPackage: '@opentiny/ng',
  componentExtraSelector,
  extraVoidElements: ['ti-image'],
  propBlacklist: { TiTable: ['border', 'stripe'] },
  libraryComponents,

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
