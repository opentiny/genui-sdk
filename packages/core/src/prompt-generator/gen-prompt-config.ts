import type { IFunctionInfo } from '../protocols/materials';
import type { CardSchema, NodeSchema } from '../protocols/schema';

export interface IGenPromptComponentProperty {
  property: string;
  description: string;
  type: string;
  required?: boolean; // 默认是false
  defaultValue?: any; // 默认是空
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
  component: string; // 组件名
  schema: IGenPromptComponentSchema;
  name?: string; // 组件label
  description?: string;
}

export interface IGenPromptExample {
  name: string;
  description?: string;
  schema: CardSchema;
}

export interface IGenPromptActionParam {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
}

export interface IGenPromptAction {
  name: string;
  description?: string;
  params?: IGenPromptActionParam[];
}

export type IGenPromptSnippet = NodeSchema;

export interface IGenPromptCustomConfig {
  customComponents?: IGenPromptComponent[];
  customSnippets?: IGenPromptSnippet[];
  customExamples?: IGenPromptExample[];
  customActions?: IGenPromptAction[];
}

export interface IGenPromptConfig extends IGenPromptCustomConfig {
  framework?: 'Vue' | 'Angular';
  strategy?: 'append' | 'override' | 'prepend';
}
