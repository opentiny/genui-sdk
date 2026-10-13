import { randomUUID } from 'node:crypto';

export function buildMessageBodyV0_3(input: string): Record<string, unknown> {
  return {
    message: {
      messageId: randomUUID(),
      role: 'user',
      parts: [{ kind: 'text', text: input }],
    },
  };
}

export function buildMessageBodyV1_0(input: string): Record<string, unknown> {
  return {
    message: {
      messageId: randomUUID(),
      role: 'ROLE_USER',
      parts: [{ text: input, mediaType: 'text/plain' }],
    },
  };
}
