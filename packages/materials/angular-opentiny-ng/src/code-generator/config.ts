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
  elementSelector,
  moduleRefMap,
  attributeSelector,
  componentExportMap,
  componentOutputs,
  libraryComponents,
} = deriveLibraryMaps(materials);

export const TINYNG_CONFIG: IAngularLibraryConfig = {
  elementSelector,
  attributeSelector,
  moduleRefMap,
  libraryPackage: '@opentiny/ng',
  componentExportMap,
  propBlacklist: { TiTable: ['border', 'stripe'] },
  componentOutputs,
  libraryComponents,

  extensions: [
    {
      name: 'tinyng:ti-form-field',
      /**
       * TiFormField 的直接子节点统一包装为 TiItem(库的表单布局约定);
       * 同时把 TiItem 的字符串 label 转成绑定形式 [label]="'姓名'",避免静态属性
       * label="姓名" 在视图创建相写 input(TiItemComponent.setItemLabel 在创建相调用
       * detectChanges() 触发 Angular 20 断言崩溃)。字符串与 JSExpression
       * 两种情形都要求以更新相写入的 [label]= 绑定输出。
       *
       * 注意是**就地改写 node.children**,不要写成 `return node.children.map(...)`:
       * 钩子签名的返回位置是 void,TS 会放行有返回值的实现,那样改写会被静默丢弃
       * (出码器为此加了运行期守卫,会在出码当场抛错)。
       *
       * 组件名要自查:出码器按 resolveConfig 路由,组件名没命中任何映射表时会兜底第一个库,
       * 那时本扩展也会被调用。
       */
      transformNode: (node) => {
        if (node.componentName !== 'TiFormField' || !Array.isArray(node.children)) {
          return;
        }
        node.children = node.children.map((child) => {
          const item: NodeSchema =
            child.componentName === 'TiItem'
              ? child
              : ({ componentName: 'TiItem', children: [child] } as NodeSchema);

          const props = item.props as Record<string, unknown> | undefined;
          const label = props?.label;
          if (typeof label === 'string') {
            const escaped = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            props!.label = { type: JS_EXPRESSION, value: `'${escaped}'` };
          }
          return item;
        });
      },
    },
  ],
};
