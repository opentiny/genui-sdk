let lastUserInput = '';

export function setBuilderLastUserInput(input: string) {
  lastUserInput = input;
}

export function getBuilderLastUserInput() {
  return lastUserInput;
}

export function extractLastUserMessageContent(messages: unknown[]): string {
  if (!Array.isArray(messages)) {
    return '';
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as { role?: string; content?: unknown; messages?: Array<{ type?: string; content?: string }> };
    if (msg?.role !== 'user') {
      continue;
    }

    if (typeof msg.content === 'string') {
      return msg.content;
    }

    if (Array.isArray(msg.messages)) {
      const textItem = msg.messages.find((item) => item.type === 'text');
      if (textItem?.content) {
        return textItem.content;
      }
    }

    return String(msg.content ?? '');
  }

  return '';
}
