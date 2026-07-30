export type OpenApiPreviewTool = {
  name: string;
  summary?: string;
  method: string;
  path: string;
};

export type OpenApiPreviewData = {
  baseUrl: string;
  toolCount: number;
  toolNames: string[];
  tools?: OpenApiPreviewTool[];
};

export type OpenApiToolServiceConfig = {
  name: string;
  openapi: string;
  description?: string;
  baseUrl?: string;
  apiHeaders?: Record<string, string>;
  toolNamePrefix?: string;
  openapiFileName?: string;
  excludeMethods?: string[];
  excludePathPrefixes?: string[];
  toolCount?: number;
  toolNames?: string[];
  tools?: OpenApiPreviewTool[];
  enabled?: boolean;
};
