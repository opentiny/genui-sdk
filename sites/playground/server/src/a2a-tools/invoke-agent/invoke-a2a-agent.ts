import { AgentCardProtocolError, resolveAgentInterface } from '../parse-card/index.js';
import type { PlaygroundAgentConfig } from '../types.js';
import { isAllowedAgentUrl, isPlaygroundDevelopment } from '../guard-agent-url/index.js';
import { buildA2aRequestHeaders } from './request/index.js';
import { invokeAgentWithOfficialSdk } from './send-message/index.js';

export type AgentInvokeResult =
  | { type: 'text'; text: string }
  | { type: 'a2a-agent-error'; message: string }
  | {
      type: 'agent-function-call-error';
      agent: { name: string };
      message: string;
    };

export async function invokeA2aAgent(
  agent: PlaygroundAgentConfig,
  input: string,
  metadata?: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<AgentInvokeResult> {
  let resolved;
  try {
    resolved = resolveAgentInterface(agent);
  } catch (error) {
    const message =
      error instanceof AgentCardProtocolError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" ${message}`,
    };
  }

  const { url, version } = resolved;

  if (!isPlaygroundDevelopment && !isAllowedAgentUrl(url)) {
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" 的 url 不允许访问（已拦截本地或内网地址）`,
    };
  }

  const headers = buildA2aRequestHeaders(agent, metadata);

  try {
    const text = await invokeAgentWithOfficialSdk(
      agent,
      version,
      url,
      input,
      headers,
      abortSignal,
    );
    return { type: 'text', text };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    const aborted = err?.name === 'AbortError' || abortSignal?.aborted;
    return {
      type: 'agent-function-call-error',
      agent: { name: agent.name },
      message: aborted ? 'Agent request was cancelled' : err?.message || String(error),
    };
  }
}
