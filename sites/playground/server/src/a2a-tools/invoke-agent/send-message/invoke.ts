import type { A2aProtocolVersion } from '../../parse-card/index.js';
import type { PlaygroundAgentConfig } from '../../types.js';
import { sendA2aMessageV0_3, sendA2aMessageV1_0 } from './adapters/index.js';

function toAgentCard(agent: PlaygroundAgentConfig): Record<string, unknown> {
  const { agentCardUrl: _agentCardUrl, enabled: _enabled, ...card } = agent;
  return card as Record<string, unknown>;
}

function withCardUrl(card: Record<string, unknown>, url: string): Record<string, unknown> {
  return { ...card, url };
}

export async function invokeAgentWithOfficialSdk(
  agent: PlaygroundAgentConfig,
  version: A2aProtocolVersion,
  url: string,
  input: string,
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const agentCard = toAgentCard(agent);
  const legacyCard = withCardUrl(agentCard, url);

  switch (version) {
    case '0.3':
      return sendA2aMessageV0_3(legacyCard, input, headers, abortSignal);
    case '1.0':
      try {
        return await sendA2aMessageV1_0(agentCard, input, headers, abortSignal);
      } catch {
        return sendA2aMessageV0_3(legacyCard, input, headers, abortSignal);
      }
    default:
      throw new Error(`不支持 A2A 协议版本 "${version}"`);
  }
}
