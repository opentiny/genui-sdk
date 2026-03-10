import type { LLMConfig } from './chat.types';

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
