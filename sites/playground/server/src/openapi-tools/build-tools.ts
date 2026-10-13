import { buildOpenApiAiSdkToolsFromDocuments } from '../openapi/index.js';
import type { OpenApiToolServiceConfig } from './types.js';

function slugifyName(name: string): string {
  const slug = name
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return /^[0-9]/.test(slug) ? `_${slug}` : slug;
}

export async function buildOpenApiTools(services: OpenApiToolServiceConfig[] | undefined) {
  const enabled = (services ?? []).filter(
    (service) => service.enabled !== false && service.openapi?.trim(),
  );

  if (!enabled.length) {
    return {};
  }

  return buildOpenApiAiSdkToolsFromDocuments(
    enabled.map((service) => ({
      openapi: service.openapi.trim(),
      config: {
        baseUrl: service.baseUrl,
        apiHeaders: service.apiHeaders,
        toolNamePrefix: service.toolNamePrefix?.trim() || slugifyName(service.name),
        excludeMethods: service.excludeMethods,
        excludePathPrefixes: service.excludePathPrefixes,
      },
    })),
  );
}
