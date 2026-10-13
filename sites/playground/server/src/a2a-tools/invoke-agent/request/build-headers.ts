import type { PlaygroundAgentConfig } from '../../types.js';

function inferAuthType(
  agent: PlaygroundAgentConfig,
  metadata?: Record<string, unknown>,
): 'bearer' | 'api_key' | null {
  const explicit = String(agent.auth?.type || metadata?.authType || '').toLowerCase();
  if (explicit === 'bearer') {
    return 'bearer';
  }
  if (explicit === 'api_key' || explicit === 'api-key') {
    return 'api_key';
  }

  const schemes = agent.authentication?.schemes;
  if (Array.isArray(schemes) && schemes.some((item) => String(item).toLowerCase() === 'bearer')) {
    return 'bearer';
  }

  const securitySchemes = agent.securitySchemes;
  if (securitySchemes && typeof securitySchemes === 'object') {
    for (const schemeDef of Object.values(securitySchemes)) {
      const scheme = String(schemeDef?.httpAuthSecurityScheme?.scheme || '').toLowerCase();
      if (scheme === 'bearer') {
        return 'bearer';
      }
    }
  }

  return null;
}

export function buildA2aRequestHeaders(
  agent: PlaygroundAgentConfig,
  metadata?: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // 与旧实现一致：apiKey 优先于 token
  const rawToken = metadata?.apiKey ?? metadata?.token;
  const token = typeof rawToken === 'string' && rawToken ? rawToken : undefined;
  if (!token) {
    return headers;
  }

  const authType = inferAuthType(agent, metadata);
  if (authType === 'bearer') {
    headers.Authorization = `Bearer ${token}`;
  } else if (authType === 'api_key') {
    headers['x-api-key'] = token;
  }

  return headers;
}
