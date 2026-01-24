import type { ICustomComponentItem, CustomFetch, ICustomActionItem } from './chat.types';
import type { IGenPromptComponent, IGenPromptSnippet, IGenPromptExample } from '@opentiny/genui-sdk-core';
const removeCustomActionsExecuteFunction = (customActions: ICustomActionItem[]) => {
  return customActions.map((action: ICustomActionItem) => {
    return {
      name: action.name,
      description: action.description,
      params: action.params,
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

export const chat = async (
  chatOptions: {
    url: string,
    messages: any,
    model: string,
    temperature: number,
    signal: any,
    customComponents: ICustomComponentItem[],
    customSnippets: IGenPromptSnippet[],
    customExamples: IGenPromptExample[],
    customActions: ICustomActionItem[],
    customFetch?: CustomFetch,
  }
) => {
  const { url, messages, model, temperature, signal, customComponents, customSnippets, customExamples, customActions, customFetch } = chatOptions;
  const tgCustomConfig = {
    customComponents: removeRefFromCustomComponents(customComponents),
    customSnippets: customSnippets,
    customExamples: customExamples,
    customActions: removeCustomActionsExecuteFunction(customActions),
  };

  const requestMetadata = {
    tinygenui: JSON.stringify(tgCustomConfig),
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      messages: messages,
      model: model,
      temperature: temperature,
      metadata: requestMetadata,
    }),
  };

  // 如果提供了自定义请求函数，使用它；否则使用默认的 fetch
  const requestFn = customFetch || fetch;
  const response = await requestFn(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
  }
  return response;
};
