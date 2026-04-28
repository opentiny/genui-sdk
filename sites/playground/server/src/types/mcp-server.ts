export type McpServerConfig = {
  name: string;
  url: string;
  description?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
};

export type McpServer = {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  enabled?: boolean;
};

export type McpServersConfig = McpServerConfig[];
