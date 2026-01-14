import type { ICustomConfig, LLMConfig, CustomRequest } from './chat.types';
const removeCustomActionsExucueFunction = (customActions: any) => {
  return customActions.map((action: any) => {
    return {
      name: action.name,
      description: action.description,
      params: action.params,
    };
  });
};

export const chat = async (
  url: string,
  messages: any,
  llmConfig: LLMConfig,
  signal: any,
  customConfig: ICustomConfig,
  customRequest?: CustomRequest,
  metadata?: Record<string, string>,
) => {
  const tgCustomConfig = {
    customComponents: customConfig.customComponentsSchema,
    customSnippets: customConfig.customSnippets,
    customExamples: customConfig.customExamples,
    customActions: removeCustomActionsExucueFunction(customConfig.customActions || []),
  };

  const requestMetadata = {
    ...metadata,
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
      model: llmConfig.model,
      temperature: llmConfig.temperature,
      metadata: requestMetadata,
    }),
  };

  // 如果提供了自定义请求函数，使用它；否则使用默认的 fetch
  const requestFn = customRequest || fetch;
  const response = await requestFn(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
  }
  return response;
};
