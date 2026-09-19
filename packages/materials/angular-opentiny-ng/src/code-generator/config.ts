// 与 derive-library-maps.ts 同款副作用导入,这里是**权威位置**:ESM 按 import 语句的
// 书写顺序求值,置于首行才能保证 @angular/compiler 先于下面的 '../materials' 完成求值
// (物料包在模块加载期就会改写 ɵcmp,见 ng-components.ts)。别把它挪到下面。
import '@angular/compiler';

import type { NodeSchema } from '@opentiny/genui-sdk-core';
import { materials } from '../materials';
import { deriveLibraryMaps } from './derive-library-maps';
import type { IAngularLibraryConfig } from './types';

/** 协议中表达式值的 type 字面量,与出码器包 constants.ts 的 JS_EXPRESSION 同值 */
const JS_EXPRESSION = 'JSExpression';

const {
  componentSelector,
  moduleRefMap,
  componentExtraSelector,
  componentExportMap,
  componentOutputs,
  libraryComponents,
} = deriveLibraryMaps(materials);

/**
 * TinyNG 组件库专属出码配置。
 *
 * 这份配置**住在物料包自己家里**(原在出码器包 libraries/tinyng/config.ts):
 * 5 张映射表由本包自己的 materials 对象现推,策略字段(transformChildren 等)也是本库自己的约定,
 * 故不存在"配置与物料包漂移"的可能。出码器只负责消费,不再持有任何组件库的名字。
 *
 * 说明:prop 形态类特判(如 TiPagination 的 pageSize 对象)已在物料包 meta/示例中直接写对,
 * 不再需要 propAdapters,故本库不配置该项。
 */
export const TINYNG_CONFIG: IAngularLibraryConfig = {
  componentSelector,
  moduleRefMap,
  libraryPackage: '@opentiny/ng',
  componentExtraSelector,
  componentExportMap,
  extraVoidElements: ['ti-image'],
  propBlacklist: { TiTable: ['border', 'stripe'] },
  componentOutputs,
  libraryComponents,

  /**
   * TiFormField 的直接子节点统一包装为 TiItem(库的表单布局约定);
   * 同时把 TiItem 的字符串 label 转成绑定形式 [label]="'姓名'",避免静态属性
   * label="姓名" 在视图创建相写 input(TiItemComponent.setItemLabel 在创建相调用
   * detectChanges() 触发 Angular 20 断言崩溃)。字符串与 JSExpression
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
