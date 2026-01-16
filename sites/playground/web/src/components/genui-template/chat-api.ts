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
