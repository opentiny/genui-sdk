import { tool } from 'ai';
import { z } from 'zod';
import type { OpenAPIV3 } from 'openapi-types';
import { listOpenApiOperationToolDefinitions } from './operation-tool-definitions.js';
import { parseOpenApiInput, resolveBaseUrl } from './parse-openapi-input.js';
import type { OpenApiToolsBuildConfig } from './types.js';

export function buildOpenApiAiSdkToolsForSpec(
  spec: OpenAPIV3.Document,
  config: OpenApiToolsBuildConfig,
): Record<string, ReturnType<typeof tool>> {
  const baseUrl = resolveBaseUrl(spec, config.baseUrl);
  const definitions = listOpenApiOperationToolDefinitions(spec, config, baseUrl);
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const definition of definitions) {
    tools[definition.toolName] = tool({
      description: definition.description,
      inputSchema: z.object(definition.inputSchema),
      execute: async (args: Record<string, unknown>) => {
        const result = await definition.execute(args);
        return result.content;
      },
    });
  }

  return tools;
}

export async function buildOpenApiAiSdkToolsFromDocuments(
  entries: Array<{ openapi: string; config: OpenApiToolsBuildConfig }>,
): Promise<Record<string, ReturnType<typeof tool>>> {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const entry of entries) {
    const spec = await parseOpenApiInput(entry.openapi);
    Object.assign(tools, buildOpenApiAiSdkToolsForSpec(spec, entry.config));
  }

  return tools;
}
