import type { IFunctionInfo, IMaterialsProtocol } from '../../material/materials-protocol';
import { getComponentsInfo } from './extract';

export interface IGenPromptComponentProperty {
  property: string;
  description: string;
  type: string;
  required?: boolean;
  defaultValue?: any;
  properties?: IGenPromptComponentProperty[];
}

export interface IGenPromptComponentEvent {
  type: string;
  functionInfo?: IFunctionInfo;
  defaultValue?: string;
  description: string;
}

export interface IGenPromptComponentSchema {
  properties?: IGenPromptComponentProperty[];
  events?: IGenPromptComponentEvent[];
  slots?: Record<string, any>;
}

export interface IGenPromptComponent {
  component: string;
  schema: IGenPromptComponentSchema;
  name?: string;
  description?: string;
}

export function genComponentsPrompt(
  materials: IMaterialsProtocol[],
  whiteList: string[],
  customComponents: IGenPromptComponent[],
) {
  const componentsInfo = getComponentsInfo(materials, whiteList) as IGenPromptComponent[];
  return `## 可用组件

必须使用以下支持的 componentName：\`${whiteList.join('`, `')}\`

具体组件的上下文如下，包含组件的配置信息：

\`\`\`json
${JSON.stringify(componentsInfo.concat(customComponents))}
\`\`\`
`;
}
