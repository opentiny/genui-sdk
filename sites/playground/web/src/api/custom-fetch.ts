import { modifyChatBody as continueGeneratingBodyModifier } from "../continue-writing/chat-body-modifier";

export interface IMcpServerConfig {
  name: string;
  url: string;
  description?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface IPlaygroundConfig {
  mcpServers: IMcpServerConfig[];
  framework: string;
  promptList: string[];
  model: string;
  temperature: number;
}

export const modifyBody = (body: any) => {
  continueGeneratingBodyModifier(body);
  
  return body;
}

// 创建 customFetch，将 mcpServers、framework、promptList、model 和 temperature 传递到 metadata
export const createCustomFetch = (getConfig: () => IPlaygroundConfig) => {
  return (url: string, options) => {
    
    const body = JSON.parse(options.body);
    const config = getConfig();
    const { mcpServers, framework, promptList, model, temperature } = config;

    const playgroundConfig = {
      mcpServers,
      framework: framework || 'Vue',
      promptList,
      model,
      temperature,
    };

    return fetch(url, {
      ...options,
      body: JSON.stringify({ ...modifyBody(body), metadata: { ...(body.metadata || {}), playground: JSON.stringify(playgroundConfig) } }),
    });
  };
};
