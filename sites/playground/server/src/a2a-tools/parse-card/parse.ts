import {
  A2A_PROTOCOL_CONFIG,
  type AgentInterfaceLike,
  type AgentProtocolSource,
  type A2aProtocolBinding,
  type A2aProtocolVersion,
} from './types.js';

export type ResolvedAgentInterface = {
  url: string;
  binding: A2aProtocolBinding;
  version: A2aProtocolVersion;
};

export class AgentCardProtocolError extends Error {
  constructor(detail: string) {
    super(`不符合 A2A 协议规范：${detail}`);
    this.name = 'AgentCardProtocolError';
  }
}

function parseA2aProtocolBinding(raw: string | undefined | null): A2aProtocolBinding | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (normalized === 'JSONRPC') {
    return 'JSONRPC';
  }
  if (normalized === 'HTTP+JSON') {
    return 'HTTP+JSON';
  }

  return null;
}

function parseA2aProtocolVersion(raw: string | undefined | null): A2aProtocolVersion | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === '1.0' || normalized.startsWith('1.0.') || normalized === '1') {
    return '1.0';
  }

  if (normalized === '0.3' || normalized.startsWith('0.3.')) {
    return '0.3';
  }

  return null;
}

function trimUrlString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveClientBinding(
  version: A2aProtocolVersion,
  parsedBinding: A2aProtocolBinding | null,
): A2aProtocolBinding | null {
  if (version === '0.3') {
    return 'JSONRPC';
  }

  return parsedBinding;
}

function parseClientSupportedInterface(item: AgentInterfaceLike): ResolvedAgentInterface | null {
  const url = trimUrlString(item?.url);
  if (!url) {
    return null;
  }

  const version = parseA2aProtocolVersion(item.protocolVersion || item.protocol_version);
  if (!version || !A2A_PROTOCOL_CONFIG.supportedVersions.includes(version)) {
    return null;
  }

  const parsedBinding = parseA2aProtocolBinding(item.protocolBinding || item.protocol_binding);
  const binding = resolveClientBinding(version, parsedBinding);
  if (!binding) {
    return null;
  }

  return { url, binding, version };
}

function resolveLegacyAgentInterface(source: AgentProtocolSource): ResolvedAgentInterface {
  const legacyUrl = trimUrlString(source.url) || trimUrlString(source.api?.url);
  if (!legacyUrl) {
    throw new AgentCardProtocolError('缺少 supportedInterfaces 或可调用的 url');
  }

  const rawVersion = source.api?.version ?? source.protocolVersion;
  let version = parseA2aProtocolVersion(
    typeof rawVersion === 'string' ? rawVersion : undefined,
  );
  if (!version) {
    const hasExplicitVersion =
      rawVersion !== undefined &&
      rawVersion !== null &&
      String(rawVersion).trim() !== '';
    if (hasExplicitVersion) {
      throw new AgentCardProtocolError('缺少有效的 protocolVersion');
    }
    // 升级兼容：旧 Playground 仅保存 api.url 时按 A2A 0.3 处理
    version = '0.3';
  }

  if (version === '1.0') {
    throw new AgentCardProtocolError('A2A 1.0 Card 缺少 supportedInterfaces');
  }

  const rawBinding = source.api?.type ?? source.preferredTransport;
  const parsedBinding = parseA2aProtocolBinding(
    typeof rawBinding === 'string' ? rawBinding : undefined,
  );
  const binding = resolveClientBinding(version, parsedBinding);
  if (!binding) {
    throw new AgentCardProtocolError('缺少 protocolBinding 或 preferredTransport');
  }

  return { url: legacyUrl, binding, version };
}

export function resolveAgentInterface(
  source: AgentProtocolSource | null | undefined,
): ResolvedAgentInterface {
  if (!source) {
    throw new AgentCardProtocolError('Agent 配置为空');
  }

  const hasInterfacesField =
    Array.isArray(source.supportedInterfaces) || Array.isArray(source.supported_interfaces);
  const interfaces = source.supportedInterfaces || source.supported_interfaces || [];

  if (hasInterfacesField) {
    if (interfaces.length === 0) {
      throw new AgentCardProtocolError('supportedInterfaces 为空');
    }

    for (const item of interfaces) {
      const resolved = parseClientSupportedInterface(item);
      if (resolved) {
        return resolved;
      }
    }

    throw new AgentCardProtocolError(
      'supportedInterfaces 中无 Client 支持的 A2A 接口，请检查 url、protocolBinding、protocolVersion',
    );
  }

  return resolveLegacyAgentInterface(source);
}

export function resolveAgentApiUrl(source: AgentProtocolSource | null | undefined): string {
  try {
    return resolveAgentInterface(source).url;
  } catch (error) {
    if (error instanceof AgentCardProtocolError) {
      return '';
    }
    throw error;
  }
}

export function normalizeAgentCard<T extends Record<string, unknown>>(
  card: T,
): T & { api: { url: string; type: string; version: string } } {
  const resolved = resolveAgentInterface(card as AgentProtocolSource);
  const existingApi =
    card.api && typeof card.api === 'object' && !Array.isArray(card.api)
      ? (card.api as Record<string, unknown>)
      : {};

  return {
    ...card,
    api: {
      ...existingApi,
      url: resolved.url,
      type: resolved.binding,
      version: resolved.version,
    },
  };
}
