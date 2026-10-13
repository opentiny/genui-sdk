import SwaggerParser from '@apidevtools/swagger-parser';
import yaml from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';
import {
  assertInlineOpenApiAllowed,
  fetchOpenApiSpecUrl,
  loadOpenApiInputPolicyFromEnv,
  readOpenApiSpecFile,
  type OpenApiInputPolicy,
} from './openapi-input-security.js';

function parseRawSpec(content: string): unknown {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  return yaml.load(trimmed);
}

function isInlineOpenApiContent(source: string): boolean {
  const trimmed = source.trim();
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('---') ||
    /^openapi\s*:/im.test(trimmed)
  );
}

async function readSpecContent(
  source: string,
  policy: OpenApiInputPolicy = loadOpenApiInputPolicyFromEnv(),
): Promise<string> {
  if (isInlineOpenApiContent(source)) {
    assertInlineOpenApiAllowed(policy);
    return source;
  }

  const trimmed = source.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return fetchOpenApiSpecUrl(trimmed, policy);
  }

  return readOpenApiSpecFile(trimmed, policy);
}

export async function parseOpenApiInput(
  openapi: string,
  policy?: OpenApiInputPolicy,
): Promise<OpenAPIV3.Document> {
  const content = await readSpecContent(openapi, policy);
  const raw = parseRawSpec(content) as OpenAPIV3.Document;
  return (await SwaggerParser.dereference(raw, {
    resolve: { external: false },
    dereference: { circular: 'ignore' },
  })) as unknown as OpenAPIV3.Document;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function pickAbsoluteServerUrl(servers?: OpenAPIV3.ServerObject[]): string | undefined {
  const url = servers?.[0]?.url;
  if (!url || url.startsWith('/')) return undefined;
  return normalizeBaseUrl(url);
}

export function resolveOperationServerUrl(
  spec: OpenAPIV3.Document,
  pathItem: OpenAPIV3.PathItemObject,
  operation: OpenAPIV3.OperationObject,
): string | undefined {
  return (
    pickAbsoluteServerUrl(operation.servers) ??
    pickAbsoluteServerUrl(pathItem.servers) ??
    pickAbsoluteServerUrl(spec.servers)
  );
}

function findFirstServerUrlInPaths(spec: OpenAPIV3.Document): string | undefined {
  for (const pathItem of Object.values(spec.paths ?? {})) {
    if (!pathItem || '$ref' in pathItem) continue;

    const pathUrl = pickAbsoluteServerUrl(pathItem.servers);
    if (pathUrl) return pathUrl;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
      if (!operation) continue;
      const opUrl = pickAbsoluteServerUrl(operation.servers);
      if (opUrl) return opUrl;
    }
  }
  return undefined;
}

export function resolveBaseUrl(spec: OpenAPIV3.Document, override?: string): string {
  if (override) {
    return normalizeBaseUrl(override);
  }

  const docUrl = pickAbsoluteServerUrl(spec.servers);
  if (docUrl) return docUrl;

  const relativeDocUrl = spec.servers?.[0]?.url;
  if (relativeDocUrl?.startsWith('/')) {
    throw new Error(`Relative server URL "${relativeDocUrl}" requires baseUrl parameter`);
  }

  const pathUrl = findFirstServerUrlInPaths(spec);
  if (pathUrl) return pathUrl;

  throw new Error('No base URL: provide baseUrl or define servers in the OpenAPI spec');
}
