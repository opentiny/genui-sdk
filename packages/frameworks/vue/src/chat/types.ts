import type {
  IChatConfig,
  ICustomActionItem,
  ICustomComponentItem,
  CustomFetch,
} from './chat.types';
import type { IGenPromptExample, IGenPromptSnippet } from '@opentiny/genui-sdk-core';

export interface GenuiChatRuntimeOptions {
  url: string;
  model: string;
  temperature: number;
  chatConfig: IChatConfig;
  customComponents: ICustomComponentItem[];
  customSnippets: IGenPromptSnippet[];
  customExamples: IGenPromptExample[];
  customActions: ICustomActionItem[];
  customFetch?: CustomFetch;
}
