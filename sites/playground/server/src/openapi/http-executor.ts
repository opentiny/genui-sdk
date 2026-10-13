import type { ApiOperation, ToolCallArgs } from './types.js';

const DEFAULT_API_REQUEST_TIMEOUT_MS = 60_000;

export function loadApiRequestTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.OPENAPI_API_TIMEOUT_MS ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_API_REQUEST_TIMEOUT_MS;
}

function isRequestTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'TimeoutError' || error.name === 'AbortError';
}

function fillPathTemplate(path: string, pathArgs: Record<string, unknown>): string {
  return path.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = pathArgs[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing required path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

function buildUrl(baseUrl: string, path: string, queryArgs: Record<string, unknown>): string {
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(queryArgs)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function formatCookiePair(name: string, value: unknown): string {
  const raw = Array.isArray(value) ? value.map(String).join(',') : String(value);
  if (/[;\r\n]/.test(name) || /[;\r\n]/.test(raw)) {
    return `${encodeURIComponent(name)}=${encodeURIComponent(raw)}`;
  }
  return `${name}=${raw}`;
}

function mergeCookieHeader(
  headers: Record<string, string>,
  cookieArgs: Record<string, unknown>,
): void {
  const pairs = Object.entries(cookieArgs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => formatCookiePair(name, value));

  if (pairs.length === 0) {
    return;
  }

  const segment = pairs.join('; ');
  const existingKey = Object.keys(headers).find((key) => key.toLowerCase() === 'cookie');

  if (existingKey) {
    headers[existingKey] = `${headers[existingKey]}; ${segment}`;
  } else {
    headers.Cookie = segment;
  }
}

function hasDefaultHeader(
  defaultHeaders: Record<string, string>,
  name: string,
): boolean {
  const lower = name.toLowerCase();
  return Object.keys(defaultHeaders).some((key) => key.toLowerCase() === lower);
}

export async function executeApiOperation(
  operation: ApiOperation,
  baseUrl: string,
  args: ToolCallArgs,
  defaultHeaders: Record<string, string> = {},
  requestTimeoutMs: number = loadApiRequestTimeoutMs(),
): Promise<{ status: number; statusText: string; headers: Record<string, string>; body: unknown }> {
  const pathArgs: Record<string, unknown> = {};
  const queryArgs: Record<string, unknown> = {};
  const headerArgs: Record<string, unknown> = {};
  const cookieArgs: Record<string, unknown> = {};

  for (const param of operation.parameters) {
    const value = args[param.name];
    if (value === undefined || value === null) {
      if (param.required) {
        if (
          (param.in === 'header' || param.in === 'cookie') &&
          hasDefaultHeader(defaultHeaders, param.name)
        ) {
          continue;
        }
        throw new Error(`Missing required parameter: ${param.name}`);
      }
      continue;
    }

    switch (param.in) {
      case 'path':
        pathArgs[param.name] = value;
        break;
      case 'query':
        queryArgs[param.name] = value;
        break;
      case 'header':
        headerArgs[param.name] = value;
        break;
      case 'cookie':
        cookieArgs[param.name] = value;
        break;
      default: {
        const unknownIn = (param as { in: string }).in;
        throw new Error(`Unsupported parameter location: ${unknownIn} (${param.name})`);
      }
    }
  }

  const filledPath = fillPathTemplate(operation.path, pathArgs);
  const url = buildUrl(baseUrl, filledPath, queryArgs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...Object.fromEntries(
      Object.entries(headerArgs).map(([k, v]) => [k, String(v)]),
    ),
  };

  for (const [key, value] of Object.entries(defaultHeaders)) {
    const existingKey = Object.keys(headers).find(
      (headerName) => headerName.toLowerCase() === key.toLowerCase(),
    );
    if (existingKey) {
      delete headers[existingKey];
    }
    headers[key] = value;
  }

  mergeCookieHeader(headers, cookieArgs);

  const init: RequestInit = {
    method: operation.method,
    headers,
  };

  if (args.body !== undefined && args.body !== null) {
    headers['Content-Type'] = operation.requestBodyContentType ?? 'application/json';
    init.body =
      typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
  }

  const signal = AbortSignal.timeout(requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal });
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      throw new Error(`API request timed out after ${requestTimeoutMs}ms`);
    }
    throw error;
  }

  const contentType = response.headers.get('content-type') ?? '';
  let body: unknown;

  try {
    if (contentType.includes('application/json')) {
      const text = await response.text();
      body = text ? JSON.parse(text) : null;
    } else {
      body = await response.text();
    }
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      throw new Error(`API request timed out after ${requestTimeoutMs}ms`);
    }
    throw error;
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body,
  };
}
