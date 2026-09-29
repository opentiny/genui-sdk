import '@angular/compiler';

import type { NodeSchema } from '@opentiny/genui-sdk-core';
import { materials } from '../materials';
import { deriveMaterialsMaps } from './derive-materials-maps';
import type { IAngularMaterialsConfig } from './types';

const JS_EXPRESSION = 'JSExpression';

const {
  elementSelector,
  moduleRefMap,
  attributeSelector,
  componentExportMap,
  componentOutputs,
  materialsComponents,
} = deriveMaterialsMaps(materials);

export const TINYNG_CONFIG: IAngularMaterialsConfig = {
  elementSelector,
  attributeSelector,
  moduleRefMap,
  libraryPackage: '@opentiny/ng',
  componentExportMap,
  propBlacklist: { TiTable: ['border', 'stripe'] },
  componentOutputs,
  materialsComponents,

  extensions: [
    {
      name: 'tinyng:ti-form-field',
      // TiFormField子节点 得是 TiItem，不是的话就补上；
      // TiItem里写 label = '姓名' 在编译时会报错，改成[label] = " '姓名' "编译时不报错
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
