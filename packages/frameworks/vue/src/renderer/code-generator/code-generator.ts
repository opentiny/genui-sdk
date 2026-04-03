/**
 * Copyright (c) 2023 - present TinyEngine Authors.
 * Copyright (c) 2023 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */

import { capitalize } from '@vue/shared';
import { toEventKey } from './event-binding';
import { traverseState, unwrapExpression } from './state-generator';
import { generateTemplate } from './template-generator';
import { validateByCompile } from './vue-sfc-validator';
import type { ICodeGeneratorParams } from './types';

/** 移除表达式中的 this 前缀。 */
const replaceThis = (value: string) => value.replace(/this\./g, '');

/** 根据组件依赖生成 import 语句。 */
const generateImports = (description, componentsMap) => {
  const { componentSet } = description;
  const imports = [];

  const importsFromVue = ['import * as vue from "vue"'];

  imports.push(importsFromVue.join('\n'));

  // import components, support alias import, import from multi packages
  const componentsInSFC = [...componentSet];
  const componentDeps = componentsMap.filter((item) => componentsInSFC.includes(item.componentName));
  const componentPacks: Record<string, any[]> = {};

  componentDeps.forEach((item) => {
    const { package: pkg } = item;

    if (!componentPacks[pkg]) {
      componentPacks[pkg] = [];
    }

    componentPacks[pkg].push(item);
  });

  Object.entries(componentPacks).forEach(([pkgName, deps]) => {
    const items = deps.map((dep) => {
      const { componentName, exportName } = dep;

      return exportName && exportName !== componentName ? `${exportName} as ${componentName}` : `${componentName}`;
    });

    imports.push(`import { ${items.join(',')} } from '${pkgName}'`);
  });

  return { imports };
};

/** 将页面 schema 转换为单文件组件源码。 */
const generateVueCode = ({ schema, name, componentsMap }) => {
  const { css = '', schema: { properties = [], events = {} } = {}, state = {}, lifeCycles = {}, methods = {} } = schema;
  const description = {
    componentSet: new Set(),
    iconComponents: { componentNames: [], exportNames: [] },
    stateAccessor: [],
    internalTypes: new Set(),
    jsResource: { utils: false, bridge: false },
  };

  const template = generateTemplate(schema, state, description, true);

  const propsArr = [];
  properties.forEach(({ content = [] }) => {
    content.forEach(({ property, type, defaultValue, accessor }) => {
      let propType = capitalize(type);
      let propValue = defaultValue;

      if (propType === 'String') {
        propValue = JSON.stringify(defaultValue);
      } else if (['Array', 'Object'].includes(propType)) {
        propValue = `() => (${JSON.stringify(defaultValue)})`;
      } else if (propType === 'Function') {
        propValue = defaultValue.value;
      }

      propsArr.push(`${property}: { type: ${propType}, default: ${propValue} }`);
    });
  });

  const emitsArr = Object.keys(events).map(toEventKey);

  // 转换 state 中的特殊类型
  traverseState(state, description);

  const reactiveStatement = `const state = vue.reactive(${unwrapExpression(JSON.stringify(state, null, 2))})`;

  const methodsArr = Object.entries(methods as Record<string, any>).map(
    ([key, item]) => `const ${key} = ${replaceThis(item.value)}`,
  );

  const { imports } = generateImports(description, componentsMap);
  const { componentNames, exportNames } = description.iconComponents;
  const iconStatement = componentNames.length
    ? `const [${componentNames.join(',')}] = [${exportNames.map((name) => `${name}()`).join(',')}]`
    : '';

  const result = `
<template>
  ${template}
</template>

<script setup>
${imports.join('\n')}

${propsArr.length ? `const props = defineProps({${propsArr.join(',\n')}})` : ''}
${emitsArr.length ? `const emit = defineEmits(${JSON.stringify(emitsArr)})` : ''}

${iconStatement}

${reactiveStatement}

${methodsArr.join('\n\n')}

</script>

<style scoped>
  ${css}
</style>
`;
  return result;
};

/** 计算生成文件的目标目录。 */
const getFilePath = (type = 'page', name = '') => {
  const defaultPathMap = { page: 'views', Page: 'views' };
  return defaultPathMap[type] || name;
};

/** 生成页面级代码面板信息。 */
const generatePageCode = ({ pageInfo, componentsMap }) => {
  const { schema: originSchema, name = 'SchemaCard' } = pageInfo;

  // 深拷贝，避免副作用改变传入的 schema 值
  const schema = JSON.parse(JSON.stringify(originSchema));
  const vueCode = generateVueCode({ schema, name, componentsMap });
  const type = 'page';
  const prettierOpts = {
    semi: false,
    singleQuote: true,
    printWidth: 120,
    trailingComma: 'none',
    endOfLine: 'auto',
    tabWidth: 2,
    parser: 'vue',
    htmlWhitespaceSensitivity: 'ignore',
  };
  const panel = {
    panelName: `${name}.vue`,
    panelValue: vueCode,
    panelType: 'vue',
    prettierOpts,
    type,
    filePath: getFilePath(type, name),
  };

  const errors = validateByCompile(panel.panelName, panel.panelValue);

  return { ...panel, errors };
};

/** 生成代码入口：过滤依赖并返回页面代码。 */
const generateCode = ({ pageInfo, componentsMap = [] }: ICodeGeneratorParams) => {
  // 过滤外部传入的无效 componentMap，比如：可能传入 HTML 原生标签 package: ''
  const validComponents = componentsMap.filter(({ componentName, package: pkg }) => componentName && pkg);

  // 对象数组，去重
  const allComponentsMap = new Map();
  validComponents.forEach(
    (item) => !allComponentsMap.has(item.componentName) && allComponentsMap.set(item.componentName, item),
  );
  const componentDepsPath = [...allComponentsMap.values()];

  const pagesCode = generatePageCode({ pageInfo, componentsMap: componentDepsPath });

  return pagesCode;
};

export { generateCode, generatePageCode };
