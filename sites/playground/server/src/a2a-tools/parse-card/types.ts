export type A2aProtocolBinding = 'JSONRPC' | 'HTTP+JSON';

export type A2aProtocolVersion = '0.3' | '1.0';

export const A2A_PROTOCOL_CONFIG = {
  supportedVersions: ['1.0', '0.3'] as A2aProtocolVersion[],
} as const;

export type AgentProtocolSource = {
  api?: { url?: string; type?: string; version?: string };
  supportedInterfaces?: AgentInterfaceLike[];
  supported_interfaces?: AgentInterfaceLike[];
  protocolVersion?: string;
  url?: string;
  preferredTransport?: string;
};

export type AgentInterfaceLike = {
  url?: string;
  protocolBinding?: string;
  protocol_binding?: string;
  protocolVersion?: string;
  protocol_version?: string;
};
