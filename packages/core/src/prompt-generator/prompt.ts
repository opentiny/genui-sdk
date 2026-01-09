import { type JsonSchema7Type, zodToJsonSchema } from 'zod-to-json-schema';
import type { IMaterials} from '../protocols';
import { genRootSchema } from '../protocols'; // TODO: protocal cannnot contains methods
import type { IGenPromptComponent, IGenPromptSnippet, IGenPromptExample } from './gen-prompt-config';
import { getComponentsName, getComponentsInfo } from './handle-component';
import { getSnippetsInfo } from './handle-snippets';
import { genCustomActionsPrompt } from './action';
import { aboutThis } from './about-this';
import { ZodTypeAny } from 'zod';

export type IWhiteList = string[];

type IRendererConfig = any;

export interface ITGCustomConfig {
  customComponents: IGenPromptComponent[];
  customSnippets: IGenPromptSnippet[];
  customExamples: IGenPromptExample[];
  customActions: any[];
}

export const promptPrefix = `
仔细阅读以下内容，并根据内容生成一个卡片的schema的JSON。
**重要：** 除了schemaJson之外，不要生成其他任何内容。
`;

export const skillPromptPrefix = `
你有一项技能，可用于生成可交互的UI界面，请结合上下文，如果需要生成界面来显示信息或收集信息，请生成对应schemaJson
`;

export const genComponentsPrompt = (
  materialsList: IMaterials[],
  whiteList: IWhiteList,
  customComponents: IGenPromptComponent[],
) => {
  const componentsInfo = getComponentsInfo(materialsList, whiteList) as IGenPromptComponent[];
  return `所有能用到的Component如下，必须使用以下支持的componentName
${whiteList.join(', ')}

具体组件的上下文如下，包含了组件的配置信息等：
\`\`\`json
${JSON.stringify(componentsInfo.concat(customComponents))}
\`\`\`  
`;
};

export const genJsonSchemaPrompt = (schemaJson: any) => {
  return `卡片的JSON Schema如下   
\`\`\`json
${JSON.stringify(schemaJson)}
\`\`\`  
`;
};

const expamleWrapCard = (schema: any, wrapperComponent: string) => {
  const newSchema = structuredClone(schema);
  const rootChildren = newSchema.children;
  newSchema.children = [{ componentName: wrapperComponent, children: [rootChildren] }];
  return {
    componentName: 'Page',
    children: [schema],
  };
};

export const genExamplesPrompt = (examples: any, wrapperComponent = 'TinyCard') => {
  const examplesStr = examples
    .map(({ name, schema }: any) => `${name}：\n\`\`\`json\n${JSON.stringify(expamleWrapCard(schema, wrapperComponent))}\n\`\`\``)
    .join('\n');
  return `这是一些卡片的示例：
${examplesStr}
`;
};

export const genSnippetsPrompt = (
  materialsList: IMaterials[],
  whiteList: IWhiteList,
  customSnippets: IGenPromptSnippet[],
) => {
  return `以下是一些组件使用的schema snippets：
\`\`\`json
${JSON.stringify(getSnippetsInfo(materialsList, whiteList).concat(customSnippets))}
\`\`\`
`;
};

export const skillRulesPrompt = ['特别重要：除了上下文数据和工具调用结果以外，禁止使用任何Mock数据'];

export const targetRulesPrompt = ['如果上下文或者工具调用结果中没有可用数据，可以使用Mock数据来完成会话'];

export const genRulesPrompt = (additionRules: string[]) => `
Schema生成有以下几点需要**特别注意**：
 - Schema必须是一个根节点componentName为Page的json
 - 如需要确认信息或者涉及继续操作，请使用this.callAction去调用continueChat。
 - 如果当前操作列数据（增删查该等），清调用this.callAction去调用saveState，去保存当前状态，方便持久化存储。
 - type是JSFunction的value必须是完整的函数
 - 表单必须要有model属性，表单输入项(input/select/radio等)必须设置modelValue的type为JSExpression且model为true, 且必须具有全局state状态，否则将不能交互
 - 如有state字段或者methods字段，请放在children之前，否则会报错，其他的字段顺序也请参考示例或snippets片段，这有助于提升渲染效果。
 - children不能放到props里， children必须是数组或者字符串，children明确不支持JSExpression表达式，使用NodeSchema数组使用Text组件包裹或者使用loop来实现。
 - 请注意对话的连续性，不要重复渲染多余内容
 - 图片和连接地址不可杜撰
 - 根节点请尽可能使用TinyCard组件包裹一下，这样会更美观, 但禁止设置颜色样式
 - 禁止设置所有组件的background,color, background-color等颜色css、stye样式
 - 禁止使用任何弹窗组件，逻辑中禁止使用alert、confirm、prompt
 - 禁止设置饼图的settings.radius
 - 生成的schema必须使用\`\`\`schemaJson\n {content} \n\`\`\`包裹
${additionRules.map((rule) => ` - ${rule}`).join('\n')}


根据用户的输入，挑选合适的组件生成一个对应卡片的schema的JSON，并输出JSON
请尽量使用丰富的UI组件生成漂亮的卡片。
输出示例：
\`\`\`schemaJson
{ "componentName":"Page", "children": [{ "componentName":"p", "children": "示例输出"}] } 
\`\`\`
`;

export const genSchema = (rendererConfig: IRendererConfig) => genRootSchema(rendererConfig.whiteList) as ZodTypeAny;

// @ts-ignore //TODO: remove this "Type instantiation is excessively deep and possibly infinite."
export const genJsonSchema = (rendererConfig: IRendererConfig) => zodToJsonSchema(genSchema(rendererConfig)) as JsonSchema7Type;

const getExtendWhiteList = (whiteList: string[], customComponents: IGenPromptComponent[]) => {
  if (!Array.isArray(customComponents) || customComponents.length === 0) {
    return whiteList;
  }
  const newWhiteList = customComponents.map((component: IGenPromptComponent) => component.component);
  return [...new Set([...whiteList, ...newWhiteList])];
};

export const genPrompt = (
  rendererConfig: IRendererConfig,
  tgCustomConfig?: ITGCustomConfig,
  options?: { isSkill?: boolean },
) => {
  const { materialsList, examples, whiteList, wrapperComponent = 'TinyCard' } = rendererConfig;
  const { customComponents, customSnippets, customExamples, customActions } = tgCustomConfig || {};
  const extendWhiteList = getExtendWhiteList(whiteList, customComponents || []);

  let prompt = options?.isSkill ? skillPromptPrefix : promptPrefix + '\n';
  const additionRules = options?.isSkill ? skillRulesPrompt : targetRulesPrompt;
  prompt += genComponentsPrompt(materialsList, extendWhiteList, customComponents || []) + '\n';
  prompt += genJsonSchemaPrompt(genJsonSchema(extendWhiteList)) + '\n';
  prompt += genExamplesPrompt(examples.concat(customExamples || []), wrapperComponent) + '\n';
  prompt += genSnippetsPrompt(materialsList, extendWhiteList, customSnippets || []) + '\n';
  prompt += aboutThis + '\n';
  prompt += genCustomActionsPrompt(customActions || []) + '\n';
  prompt += genRulesPrompt(additionRules);

  return prompt;
};
