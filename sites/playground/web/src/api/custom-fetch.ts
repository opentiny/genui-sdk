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
  prompt: string;
}

// 创建 customFetch，将 mcpServers、framework 和 prompt 传递到 metadata
export const createCustomFetch = (getConfig: () => IPlaygroundConfig) => {
  return (url: string, options) => {
    // 解析请求 body
    const body = JSON.parse(options.body);

    // 动态获取最新的配置
    const config = getConfig();
    const { mcpServers, framework, prompt } = config;

    const palygroundConfig = {
      mcpServers: mcpServers || [],
      framework: framework || 'Vue',
      prompt: prompt || '',
    };

    return fetch(url, {
      ...options,
      body: JSON.stringify({ ...body, metadata: { ...(body.metadata || {}), palygroud: JSON.stringify(palygroundConfig) } }),
    });
  };
};
