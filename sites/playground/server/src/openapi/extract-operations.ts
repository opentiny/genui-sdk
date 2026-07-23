import type { OpenAPIV3 } from 'openapi-types';
import { resolveOperationServerUrl } from './parse-openapi-input.js';
import type { ApiOperation, ApiParameter, OpenApiToolsBuildConfig } from './types.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

function sanitizeToolName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return /^[0-9]/.test(sanitized) ? `_${sanitized}` : sanitized;
}

function buildToolName(
  method: string,
  path: string,
  operationId: string | undefined,
  prefix?: string,
): string {
  const base = operationId
    ? sanitizeToolName(operationId)
    : sanitizeToolName(`${method}_${path.replace(/[{}\/]/g, '_')}`);
  return prefix ? `${sanitizeToolName(prefix)}_${base}` : base;
}

function resolveParameter(
  param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject,
): ApiParameter | null {
  if ('$ref' in param) return null;

  const schema =
    (param.schema as OpenAPIV3.SchemaObject | undefined) ??
    ({
      type: 'string',
    } as OpenAPIV3.SchemaObject);

  return {
    name: param.name,
    in: param.in as ApiParameter['in'],
    required: Boolean(param.required),
    description: param.description,
    schema,
  };
}

function pickJsonRequestBody(
  requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject | undefined,
): { schema?: OpenAPIV3.SchemaObject; required: boolean; contentType: string } | null {
  if (!requestBody || '$ref' in requestBody) return null;

  const content = requestBody.content ?? {};
  let mediaType: OpenAPIV3.MediaTypeObject | undefined;
  let contentType: string | undefined;

  if (content['application/json']) {
    mediaType = content['application/json'];
    contentType = 'application/json';
  } else if (content['application/*+json']) {
    mediaType = content['application/*+json'];
    contentType = 'application/*+json';
  } else {
    const found = Object.entries(content).find(([ct]) => ct.includes('json'));
    if (found) {
      contentType = found[0];
      mediaType = found[1];
    }
  }

  if (!mediaType?.schema || '$ref' in mediaType.schema) return null;

  return {
    schema: mediaType.schema as OpenAPIV3.SchemaObject,
    required: Boolean(requestBody.required),
    contentType: contentType ?? 'application/json',
  };
}

export function extractOperations(
  spec: OpenAPIV3.Document,
  config: Pick<OpenApiToolsBuildConfig, 'excludeMethods' | 'excludePathPrefixes' | 'toolNamePrefix'>,
): ApiOperation[] {
  const excludeMethods = new Set(
    (config.excludeMethods ?? ['options', 'head']).map((m) => m.toLowerCase()),
  );
  const excludePrefixes = config.excludePathPrefixes ?? [];
  const operations: ApiOperation[] = [];
  const usedNames = new Set<string>();

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    if (excludePrefixes.some((prefix) => path.startsWith(prefix))) continue;
    if (!pathItem || '$ref' in pathItem) continue;

    const pathLevelParams = (pathItem.parameters ?? [])
      .map(resolveParameter)
      .filter((p): p is ApiParameter => p !== null);

    for (const method of HTTP_METHODS) {
      if (excludeMethods.has(method)) continue;

      const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
      if (!operation) continue;

      const opParams = (operation.parameters ?? [])
        .map(resolveParameter)
        .filter((p): p is ApiParameter => p !== null);

      const parametersMap = new Map<string, ApiParameter>();
      for (const p of [...pathLevelParams, ...opParams]) {
        parametersMap.set(`${p.in}:${p.name}`, p);
      }

      const requestBody = pickJsonRequestBody(operation.requestBody);
      let toolName = buildToolName(method, path, operation.operationId, config.toolNamePrefix);

      while (usedNames.has(toolName)) {
        toolName = `${toolName}_${method}`;
      }
      usedNames.add(toolName);

      operations.push({
        toolName,
        method: method.toUpperCase(),
        path,
        baseUrl: resolveOperationServerUrl(spec, pathItem, operation),
        summary: operation.summary,
        description: operation.description ?? operation.summary,
        parameters: [...parametersMap.values()],
        requestBodySchema: requestBody?.schema,
        requestBodyRequired: requestBody?.required,
        requestBodyContentType: requestBody?.contentType,
      });
    }
  }

  return operations;
}
