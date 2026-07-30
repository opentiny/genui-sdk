import { ClientFactory } from '@a2a-js/sdk-v1/client';
import { buildMessageBodyV1_0 } from '../build-body.js';
import { buildSdkRequestOptions } from '../build-options.js';
import { extractA2aResponseText } from '../parse-response.js';

export async function sendA2aMessageV1_0(
  agentCard: Record<string, unknown>,
  input: string,
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const factory = new ClientFactory();
  const client = await factory.createFromAgentCard(agentCard as never);
  const result = await client.sendMessage(
    buildMessageBodyV1_0(input) as never,
    buildSdkRequestOptions(headers, abortSignal) as never,
  );
  return extractA2aResponseText(result);
}
