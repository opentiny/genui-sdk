import type { LLMConfig } from './chat.types';
import type { ICustomComponentItem, CustomFetch, ICustomActionItem } from '@opentiny/genui-sdk-vue';
import type { IGenPromptComponent, IGenPromptSnippet, IGenPromptExample } from '@opentiny/genui-sdk-core';

const removeCustomActionsExecuteFunction = (customActions: ICustomActionItem[]) => {
  return customActions.map((action: ICustomActionItem) => {
    return {
      name: action.name,
      description: action.description,
      parameters: action.parameters,
    };
  });
};

// 从 customComponents 中移除 ref 字段，只保留 schema 信息
const removeRefFromCustomComponents = (customComponents: ICustomComponentItem[]): IGenPromptComponent[] => {
  return customComponents.map((item) => {
    const { ref, ...rest } = item;
    return rest;
  });
};

export const chat = async (url: string, messages: any, llmConfig: LLMConfig, signal: any, schema: any) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({ messages: messages, llmConfig, schema }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
  }
  return response;
};

export const templateChat = async (chatOptions: {
  url: string;
  messages: any;
  signal: any;
  templateSchema: any;
  llmConfig: LLMConfig
}) => {
  const { url, messages, signal, templateSchema, llmConfig } = chatOptions;

  const requestMetadata = {
    playground: JSON.stringify(llmConfig),
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      messages: messages,
      metadata: requestMetadata,
      templateSchema: templateSchema,
    }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
  }
  return response;
};
