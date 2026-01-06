import type { ICustomConfig, LLMConfig } from './chat.types';
const removeCustomActionsExucueFunction = (customActions: any) => {
  return customActions.map((action: any) => {
    return {
      name: action.name,
      description: action.description,
      params: action.params,
    }
  });
};

export const chat = async (
  url: string,
  messages: any,
  llmConfig: LLMConfig,
  signal: any,
  customConfig: ICustomConfig,
) => {
  const tgCustomConfig = {
    customComponents: customConfig.customComponentsSchema,
    customSnippets: customConfig.customSnippets,
    customExamples: customConfig.customExamples,
    customActions: removeCustomActionsExucueFunction(customConfig.customActions || []),
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({ messages: messages, llmConfig, metadata: { tinygenui: tgCustomConfig } }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
  }
  return response;
};
