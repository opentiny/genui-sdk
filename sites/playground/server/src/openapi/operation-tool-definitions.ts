import type { OpenAPIV3 } from 'openapi-types';
import type { ZodRawShape } from 'zod';
import type { ApiOperation, DynamicToolInfo, OpenApiToolsBuildConfig, ToolCallArgs } from './types.js';
import { extractOperations } from './extract-operations.js';
import { executeApiOperation, loadApiRequestTimeoutMs } from './http-executor.js';
import { parametersToZodShape, requestBodyToZodField } from './schema-to-zod.js';

export type OpenApiOperationToolDefinition = {
  toolName: string;
  description: string;
  inputSchema: ZodRawShape;
  toolInfo: DynamicToolInfo;
  execute: (args: ToolCallArgs) => Promise<{
    content: [{ type: 'text'; text: string }];
    isError: boolean;
  }>;
};

function hasInjectedApiHeader(apiHeaders: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(apiHeaders).some((key) => key.toLowerCase() === lower);
}

function buildOperationToolDefinition(
  operation: ApiOperation,
  baseUrl: string,
  apiHeaders: Record<string, string>,
  requestTimeoutMs: number,
): OpenApiOperationToolDefinition {
  const toolParameters = operation.parameters.filter(
    (param) => param.in !== 'header' || !hasInjectedApiHeader(apiHeaders, param.name),
  );
  const paramShape = parametersToZodShape(
    toolParameters.map((p) => ({
      name: p.name,
      schema: p.schema,
      required: p.required,
      description: p.description,
    })),
  );

  const bodyShape = requestBodyToZodField(
    operation.requestBodySchema,
    Boolean(operation.requestBodyRequired),
  );

  const inputSchema = { ...paramShape, ...bodyShape };
  const summary = operation.description ?? `${operation.method} ${operation.path}`;
  const description = `[${operation.method} ${operation.path}] ${summary}`;

  return {
    toolName: operation.toolName,
    description,
    inputSchema,
    toolInfo: {
      name: operation.toolName,
      method: operation.method,
      path: operation.path,
      description,
    },
    execute: async (args) => {
      try {
        const result = await executeApiOperation(
          operation,
          baseUrl,
          args,
          apiHeaders,
          requestTimeoutMs,
        );

        const text = JSON.stringify(
          {
            status: result.status,
            statusText: result.statusText,
            data: result.body,
          },
          null,
          2,
        );

        return {
          content: [{ type: 'text' as const, text }],
          isError: result.status >= 400,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `API call failed: ${message}` }],
          isError: true,
        };
      }
    },
  };
}

export function listOpenApiOperationToolDefinitions(
  spec: OpenAPIV3.Document,
  config: OpenApiToolsBuildConfig,
  baseUrl: string,
): OpenApiOperationToolDefinition[] {
  const operations = extractOperations(spec, config);
  const apiHeaders = config.apiHeaders ?? {};
  const envTimeoutMs = loadApiRequestTimeoutMs();
  const requestTimeoutMs = Math.min(config.requestTimeoutMs ?? envTimeoutMs, envTimeoutMs);

  return operations.map((operation) =>
    buildOperationToolDefinition(
      operation,
      config.baseUrl ?? operation.baseUrl ?? baseUrl,
      apiHeaders,
      requestTimeoutMs,
    ),
  );
}
