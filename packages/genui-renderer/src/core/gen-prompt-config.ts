import type { IFunctionInfo } from '../../../core/src/protocols/materials';
import type { CardSchema, NodeSchema } from './schema';

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

export type IGenPromptSnippet = NodeSchema;

export interface IGenPromptConfig {
  framework?: 'Vue' | 'Angular';
  strategy?: 'append' | 'override' | 'prepend';
  customComponents?: IGenPromptComponent[];
  customSnippets?: IGenPromptSnippet[];
  customExamples?: IGenPromptExample[];
  customActions?: any[];
}