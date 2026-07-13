import type { A2aProtocolVersion } from '../../parse-card/index.js';
import type { PlaygroundAgentConfig } from '../../types.js';
import { sendA2aMessageV03, sendA2aMessageV10 } from './adapters/index.js';

function toAgentCard(agent: PlaygroundAgentConfig): Record<string, unknown> {
  const { agentCardUrl: _agentCardUrl, enabled: _enabled, ...card } = agent;
  return card as Record<string, unknown>;
}

export async function invokeAgentWithOfficialSdk(
  agent: PlaygroundAgentConfig,
  version: A2aProtocolVersion,
  input: string,
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const agentCard = toAgentCard(agent);

  switch (version) {
    case '0.3':
      return sendA2aMessageV03(agentCard, input, headers, abortSignal);
    case '1.0':
      return sendA2aMessageV10(agentCard, input, headers, abortSignal);
    default:
      throw new Error(`不支持 A2A 协议版本 "${version}"`);
  }
}
