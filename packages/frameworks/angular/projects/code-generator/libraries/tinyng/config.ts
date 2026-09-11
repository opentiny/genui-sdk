import type { NodeSchema } from '@opentiny/genui-sdk-core';
import { JS_EXPRESSION } from '../../constants';
import type { IAngularLibraryConfig } from '../../types';
import { componentSelector, moduleRefMap, componentExtraSelector, libraryComponents } from './map';

/**
 * TinyNG 组件库专属配置:映射表来自物料包推导(map.ts)。
 * 组件库差异全部收敛为纯配置/策略,登记到 angular-code-generator.ts 的 BUILTIN_LIBRARIES 内置注册表
 * (使用方还可经 IAngularCodeGeneratorOptions.libraries 按实例注入其它库配置)。
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
   * 同时把 TiItem 的字符串 label 转成绑定形式 [label]="'姓名'",避免静态属性
   * label="姓名" 在视图创建相写 input(见 record.md §3:TiItemComponent.setItemLabel
   * 在创建相调用 detectChanges() 触发 Angular 20 断言崩溃)。字符串与 JSExpression
   * 两种情形都要求以更新相写入的 [label]= 绑定输出。
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
        if (typeof label === 'string') {
          const escaped = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
          props!.label = { type: JS_EXPRESSION, value: `'${escaped}'` };
        }
        return item;
      });
    }
    return undefined;
  },
};
