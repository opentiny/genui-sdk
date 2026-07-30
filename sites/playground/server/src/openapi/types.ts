import type { OpenAPIV3 } from 'openapi-types';

export type OpenApiToolsBuildConfig = {
  baseUrl?: string;
  apiHeaders?: Record<string, string>;
  excludeMethods?: string[];
  excludePathPrefixes?: string[];
  toolNamePrefix?: string;
  requestTimeoutMs?: number;
};

export type ApiParameter = {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: OpenAPIV3.SchemaObject;
};

export type ApiOperation = {
  toolName: string;
  method: string;
  path: string;
  baseUrl?: string;
  summary?: string;
  description?: string;
  parameters: ApiParameter[];
  requestBodySchema?: OpenAPIV3.SchemaObject;
  requestBodyRequired?: boolean;
  requestBodyContentType?: string;
};

export type ToolCallArgs = Record<string, unknown>;

export type DynamicToolInfo = {
  name: string;
  method: string;
  path: string;
  description: string;
};
