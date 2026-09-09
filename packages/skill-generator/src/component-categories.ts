import type { IMaterialsProtocol } from '@opentiny/genui-sdk-core';

/** 组件类型 id，顺序即索引展示顺序 */
export type ComponentCategoryId =
  | 'basic'
  | 'layout'
  | 'forms'
  | 'data-display'
  | 'charts'
  | 'other';

/** 按类型分组后的白名单 */
export interface IComponentCategoryGroup {
  id: ComponentCategoryId;
  /** 中文标题，同时用作 Markdown 锚点 */
  label: string;
  components: string[];
  /** 该类型 props / events 文件，相对 reference/；有则索引优先链此文件 */
  detailRelPath?: string;
}

export interface IGroupComponentsOptions {
  materials?: IMaterialsProtocol[];
  customComponents?: Array<{ component: string }>;
}

/** 类型标题与可选手写分类文档的对应关系 */
export const COMPONENT_CATEGORY_DOCS: ReadonlyArray<{
  id: ComponentCategoryId;
  file: string;
  label: string;
}> = [
  { id: 'basic', file: 'basic.md', label: '基础元素' },
  { id: 'layout', file: 'layout.md', label: '布局组件' },
  { id: 'forms', file: 'forms.md', label: '表单组件' },
  { id: 'data-display', file: 'data-display.md', label: '数据展示' },
  { id: 'charts', file: 'charts.md', label: '图表组件' },
  { id: 'other', file: 'other.md', label: '其他' },
];

const CATEGORY_BY_ID = new Map(COMPONENT_CATEGORY_DOCS.map((item) => [item.id, item]));

const HTML_TAGS = new Set([
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ol',
  'ul',
  'li',
  'div',
  'video',
  'label',
  'span',
  'button',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'section',
  'header',
  'footer',
  'nav',
  'main',
]);

const BASIC_COMPONENTS = new Set(['Img', 'Slot', 'Text', 'TinyIcon']);

const LAYOUT_COMPONENTS = new Set(['TinyCard']);

const FORM_COMPONENTS = new Set([
  'TinyForm',
  'TinyFormItem',
  'TinyButton',
  'TinyInput',
  'TinyRadio',
  'TinyRadioGroup',
  'TinySelect',
  'TinySwitch',
  'TinyNumeric',
  'TinyCheckbox',
  'TinyCheckboxButton',
  'TinyCheckboxGroup',
  'TinyDatePicker',
  'input',
]);

const DATA_DISPLAY_COMPONENTS = new Set(['TinyGrid', 'TinyPager']);

const MATERIAL_CATEGORY_TO_ID: Record<string, ComponentCategoryId> = {
  html: 'basic',
  基础元素: 'basic',
  容器组件: 'layout',
  布局组件: 'layout',
  图表组件: 'charts',
  表单组件: 'forms',
  数据展示: 'data-display',
};

/**
 * 从白名单 Markdown 片段解析组件名，例如 `` `A`, `B` `` → `['A', 'B']`。
 *
 * @param whitelistText - 含反引号的白名单文本
 * @returns 组件名列表
 */
export function parseWhitelistNames(whitelistText: string): string[] {
  return [...whitelistText.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

/**
 * 将组件名格式化为白名单 Markdown。
 *
 * @param names - 组件名列表
 * @returns 反引号列表
 */
export function formatComponentList(names: string[]): string {
  return names.map((name) => `\`${name}\``).join(', ');
}

function classifyByName(component: string): ComponentCategoryId | undefined {
  if (component.startsWith('TinyHuicharts')) return 'charts';
  if (DATA_DISPLAY_COMPONENTS.has(component)) return 'data-display';
  if (LAYOUT_COMPONENTS.has(component)) return 'layout';
  if (FORM_COMPONENTS.has(component) || component.startsWith('TinyForm')) return 'forms';
  if (HTML_TAGS.has(component) || BASIC_COMPONENTS.has(component)) return 'basic';
  return undefined;
}

function classifyByMaterialCategory(category?: string): ComponentCategoryId | undefined {
  if (!category) return undefined;
  return MATERIAL_CATEGORY_TO_ID[category];
}

function extractMaterialCategories(materials: IMaterialsProtocol[] = []): Map<string, string> {
  const map = new Map<string, string>();

  for (const material of materials) {
    const components = material.data?.materials?.components ?? [];
    for (const item of components) {
      if (item.component && item.category && !map.has(item.component)) {
        map.set(item.component, item.category);
      }
    }
  }

  return map;
}

function classifyComponent(
  component: string,
  materialCategory?: string,
): ComponentCategoryId {
  return classifyByName(component) ?? classifyByMaterialCategory(materialCategory) ?? 'other';
}

/**
 * 按类型分组白名单。名称启发式优先于笼统的物料 `general` / `html` 等分类。
 *
 * @param whiteList - 物料白名单
 * @param options - 物料与自定义组件，用于补充分类
 * @returns 仅包含非空分组、顺序稳定的类型列表
 */
export function groupComponentsByCategory(
  whiteList: string[],
  options: IGroupComponentsOptions = {},
): IComponentCategoryGroup[] {
  const names = [
    ...new Set([
      ...whiteList,
      ...(options.customComponents?.map((item) => item.component) ?? []),
    ]),
  ].filter(Boolean);
  const materialCategories = extractMaterialCategories(options.materials);
  const buckets = new Map<ComponentCategoryId, string[]>(
    COMPONENT_CATEGORY_DOCS.map(({ id }) => [id, []]),
  );

  for (const name of names) {
    const id = classifyComponent(name, materialCategories.get(name));
    buckets.get(id)?.push(name);
  }

  return COMPONENT_CATEGORY_DOCS.flatMap(({ id }) => {
    const components = buckets.get(id) ?? [];
    if (components.length === 0) return [];
    const meta = CATEGORY_BY_ID.get(id);
    return [{ id, label: meta?.label ?? id, components }];
  });
}
