import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import { miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import mobileJson from './materials/mobile.json' with { type: 'json' };
import { examples } from './example-schema';
import { mobileWhiteList } from './white-list';

const MOBILE_RULES = [
  '页面按移动端视口设计，禁止使用固定宽度（如 width: 375px），宽度使用 100% 或 w-full',
  '优先使用 Tailwind 工具类（如 p-4、text-sm、rounded-lg）和原生标签控制布局与间距',
  '底部导航使用 TinyTabbar + TinyTabbarItem，并通过 modelValue 绑定当前选中项',
  '弹窗、操作面板等浮层使用 TinyPopup / TinyActionSheet，不要自行实现遮罩',
];

// 协议内置的演示片段会混入 PC 组件（如 TinyGrid），按移动端白名单剔除
const BUILTIN_COMPONENTS = new Set(['Page', 'Text', 'Template']);
const allowedComponents = new Set([...mobileWhiteList, ...BUILTIN_COMPONENTS]);

function collectComponents(node: any, result: Set<string>) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectComponents(item, result));
    return result;
  }
  if (!node || typeof node !== 'object') {
    return result;
  }
  if (typeof node.componentName === 'string') {
    result.add(node.componentName);
  }
  collectComponents(node.children, result);
  return result;
}

function filterSnippetGroups(groups: any[]) {
  return groups
    .map((group) => ({
      ...group,
      children: (group.children ?? []).filter((snippet: any) => {
        const used = collectComponents(snippet.schema, new Set());
        return [...used].every((name) => allowedComponents.has(name));
      }),
    }))
    .filter((group) => group.children.length > 0);
}

function filterMobileMaterials(materials: IMaterialsProtocol[]): IMaterialsProtocol[] {
  return materials.map((group) => {
    const snippets = group.data?.materials?.snippets;
    if (!snippets) {
      return group;
    }
    return {
      ...group,
      data: {
        ...group.data,
        materials: {
          ...group.data.materials,
          snippets: filterSnippetGroups(snippets),
        },
      },
    };
  });
}

export const mobileMaterialsMeta: IMaterialsMeta = {
  materials: [...filterMobileMaterials(miniMaterialsMeta.materials), mobileJson as IMaterialsProtocol],
  wrapperComponent: 'TinyCard',
  whiteList: mobileWhiteList,
  examples,
  rules: MOBILE_RULES,
};
