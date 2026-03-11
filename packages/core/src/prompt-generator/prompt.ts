import { type JsonSchema7Type, zodToJsonSchema } from 'zod-to-json-schema';
import type { IMaterials, CardSchema, IRendererConfig, IExample } from '../protocols';
import { genRootSchema } from '../protocols'; // TODO: protocal cannnot contains methods
import type {
  IGenPromptComponent,
  IGenPromptSnippet,
  IGenPromptExample,
  IGenPromptCustomConfig,
} from './gen-prompt-config';
import { getComponentsName, getComponentsInfo } from './handle-component';
import { getSnippetsInfo } from './handle-snippets';
import { genCustomActionsPrompt } from './action';
import { aboutThis } from './about-this';
import { ZodTypeAny } from 'zod';

export type IWhiteList = string[];

export const promptPrefix = `# 任务说明

仔细阅读以下内容，并根据上下文信息生成一个卡片的 schemaJSON。

**重要：** 除了 schemaJson 之外，不要生成其他任何内容。
`;

export const skillPromptPrefix = `# 技能说明

你有一项技能，可用于生成可交互的 UI 界面。请结合上下文，如果需要生成界面来显示信息或收集信息，请生成对应的 schemaJson。
`;

export const genComponentsPrompt = (
  materialsList: IMaterials[],
  whiteList: IWhiteList,
  customComponents: IGenPromptComponent[],
) => {
  const componentsInfo = getComponentsInfo(materialsList, whiteList) as IGenPromptComponent[];
  return `## 可用组件

必须使用以下支持的 componentName：\`${whiteList.join('`, `')}\`

具体组件的上下文如下，包含组件的配置信息：

\`\`\`json
${JSON.stringify(componentsInfo.concat(customComponents))}
\`\`\`
`;
};

export const genJsonSchemaPrompt = (schemaJson: JsonSchema7Type) => {
  return `## 卡片的 JSON Schema

\`\`\`json
${JSON.stringify(schemaJson)}
\`\`\`
`;
};

const expamleWrapCard = (schema: CardSchema, wrapperComponent: string) => {
  const newSchema = { ...schema };
  const rootChildren = newSchema.children;
  if (rootChildren) {
    newSchema.children = [{ componentName: wrapperComponent, children: rootChildren }];
  }
  return newSchema;
};

export const genExamplesPrompt = (examples: IExample[], wrapperComponent = 'TinyCard') => {
  const examplesStr = examples
    .map(
      ({ name, schema }: IExample) =>
        `### ${name}\n\n\`\`\`json\n${JSON.stringify(expamleWrapCard(schema, wrapperComponent))}\n\`\`\``,
    )
    .join('\n\n');
  return `## 卡片示例

${examplesStr}
`;
};

export const genSnippetsPrompt = (
  materialsList: IMaterials[],
  whiteList: IWhiteList,
  customSnippets: IGenPromptSnippet[],
) => {
  return `## Schema Snippets

以下是一些组件使用的 schema 片段：

\`\`\`json
${JSON.stringify(getSnippetsInfo(materialsList, whiteList).concat(customSnippets))}
\`\`\`
`;
};

export const skillRulesPrompt = ['特别重要：除了上下文数据和工具调用结果以外，禁止使用任何Mock数据'];

export const targetRulesPrompt = ['如果上下文或者工具调用结果中没有可用数据，可以使用Mock数据来完成会话'];

export const genRulesPrompt = (additionRules: string[], tgCustomConfig?: IGenPromptCustomConfig) => {
  const hasContinueChat = tgCustomConfig?.customActions?.some((action) => action.name === 'continueChat');
  const hasSaveState = tgCustomConfig?.customActions?.some((action) => action.name === 'saveState');

  const actionRules: string[] = [];
  if (hasContinueChat) {
    actionRules.push('- 如需要确认信息或者涉及继续操作，请使用 `this.callAction` 去调用 continueChat');
  }
  if (hasSaveState) {
    actionRules.push(
      '- 如果当前操作列数据（增删查改等），请调用 `this.callAction` 去调用 saveState，保存当前状态，方便持久化存储',
    );
  }

  const rules = [
    '- schemaJson 必须是一个根节点 `componentName` 为 `Page` 的 JSON',
    ...actionRules,
    '- `type` 为 `JSFunction` 的 `value` 必须是完整的函数',
    '- 表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有全局 `state` 状态，否则将不能交互',
    '- `state` 和 `methods` 字段必须紧跟 `"componentName": "Page",` 之后，请务必先生成 `state` 和 `methods` 字段，再使用。',
    '- `children` 不能放到 `props` 里，必须是数组或字符串，不支持 `JSExpression` 表达式；请使用 `Text` 组件包裹或使用 `loop` 来实现，使用 `condition` 来控制显示',
    '- 请注意对话的连续性，不要重复渲染多余内容',
    '- 图片和链接地址不可杜撰',
    '- 根节点请尽可能使用 `TinyCard` 组件包裹，但禁止设置颜色样式',
    '- 禁止设置所有组件的 `background`、`color`、`background-color` 等颜色 CSS 样式',
    '- 禁止使用任何弹窗组件，逻辑中禁止使用 `alert`、`confirm`、`prompt`',
    '- 禁止设置饼图的 `settings.radius`',
    '- 生成的 schemaJson 必须使用 \`\`\`schemaJson {content} \`\`\` 代码块包裹',
    ...additionRules.map((rule) => `- ${rule}`),
  ].join('\n');

  return `## schemaJson 生成规则

以下规则需要**特别注意**：

${rules}

---

根据用户输入，挑选合适的组件生成对应卡片的 schemaJSON。请尽量使用丰富的 UI 组件生成漂亮的卡片。

**输出示例：**

\`\`\`schemaJson
{ "componentName": "Page", "state": { "name": "张三" }, "methods": {}, "children": [{ "componentName": "p", "children": "示例输出" }] }
\`\`\`

### 最高优先级规则

以下规则具有最高优先级，必须严格满足：

- 如果有信息要展示，请主动生成卡片
- 如果需要用户提供更多信息补充，请主动生成表单卡片
- 如果生成的卡片是表单卡片，一定要使用双向绑定功能，\`modelValue\` 的 \`model\` 属性要设置为 true，即 \`modelValue.model = true\`

**其他规则与最高优先级规则冲突时，忽略其他规则，优先满足最高优先级规则。**
`;
};

export const genSchema = (whiteList: string[]) => genRootSchema(whiteList) as ZodTypeAny;

// @ts-ignore //TODO: remove this "Type instantiation is excessively deep and possibly infinite."
export const genJsonSchema = (whiteList: string[]) => zodToJsonSchema(genSchema(whiteList)) as JsonSchema7Type;

const getExtendWhiteList = (whiteList: string[], customComponents: IGenPromptComponent[]) => {
  if (!Array.isArray(customComponents) || customComponents.length === 0) {
    return whiteList;
  }
  const newWhiteList = customComponents.map((component: IGenPromptComponent) => component.component);
  return [...new Set([...whiteList, ...newWhiteList])];
};

export const genPrompt = (
  rendererConfig: IRendererConfig,
  tgCustomConfig?: IGenPromptCustomConfig,
  options?: { isSkill?: boolean },
) => {
  const { materialsList, examples, whiteList, wrapperComponent = 'TinyCard' } = rendererConfig;
  const { customComponents, customSnippets, customExamples, customActions } = tgCustomConfig || {};
  const extendWhiteList = getExtendWhiteList(whiteList, customComponents || []);

  const additionRules = options?.isSkill ? skillRulesPrompt : targetRulesPrompt;

  const sections = [
    options?.isSkill ? skillPromptPrefix : promptPrefix,
    genComponentsPrompt(materialsList, extendWhiteList, customComponents || []),
    genJsonSchemaPrompt(genJsonSchema(extendWhiteList)),
    genExamplesPrompt(examples.concat(customExamples || []), wrapperComponent),
    genSnippetsPrompt(materialsList, extendWhiteList, customSnippets || []),
    aboutThis.trim(),
    genCustomActionsPrompt(customActions || []),
    genRulesPrompt(additionRules, tgCustomConfig),
  ].filter(Boolean);

  return sections.join('\n\n');
};
