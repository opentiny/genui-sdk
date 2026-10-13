import {
  extractOperations,
  parseOpenApiInput,
  resolveBaseUrl,
} from '../openapi/index.js';
import type { OpenApiPreviewData } from './types.js';

export type PreviewOpenApiInput = {
  openapi: string;
  toolNamePrefix?: string;
};

export async function previewOpenApiTools(
  input: PreviewOpenApiInput,
): Promise<OpenApiPreviewData> {
  const spec = await parseOpenApiInput(input.openapi);
  const baseUrl = resolveBaseUrl(spec);
  const operations = extractOperations(spec, { toolNamePrefix: input.toolNamePrefix });

  const tools = operations.map((op) => ({
    name: op.toolName,
    summary: op.summary,
    method: op.method,
    path: op.path,
  }));

  return {
    baseUrl,
    toolCount: operations.length,
    toolNames: tools.map((tool) => tool.name),
    tools,
  };
}
