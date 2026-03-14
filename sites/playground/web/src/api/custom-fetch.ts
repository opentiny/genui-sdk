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
  const { messages } = body;
  if (messages?.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.requireMore) {
      messages.push({
        role: 'user',
        content: `上一轮内容未完成，请从上次中断的地方继续往下输出，不要生成已经输出过的内容, 否则拼接会失败，不要增加任何新的包裹，直接继续写，上一轮最后的字符为：\`${lastMessage.content.slice(-50)}\`（不包含反引号和反引号包裹）, 请先输出上一轮最后的字符然后继续往下写`,
      });
    }
  }
  
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
