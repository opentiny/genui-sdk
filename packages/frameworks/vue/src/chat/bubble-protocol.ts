import type { BubbleMessage, ChatMessageContent, TemplateItem } from '@opentiny/tiny-robot';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IMessageItem } from './chat.types';
import type { FileMeta } from './file-upload/file-utils';

export function resolveBubbleContents(message: BubbleMessage): ChatMessageContent {
  const resolved = (message as ChatMessage & { messages?: ChatMessageContent }).messages ?? message.content;
  return resolved as ChatMessageContent;
}

export function getResolvedContent(rendererProps: { message: any; contentIndex: number }) {
  const resolved = resolveBubbleContents(rendererProps.message as BubbleMessage);
  if (Array.isArray(resolved)) {
    return resolved[rendererProps.contentIndex] ?? {};
  }
  if (rendererProps.contentIndex === 0 && typeof resolved === 'string') {
    return { type: 'text', text: resolved, content: resolved };
  }
  return {};
}

export function getResolvedContentText(item: { content?: unknown; text?: unknown }) {
  if (typeof item.content === 'string') return item.content;
  if (typeof item.text === 'string') return item.text;
  return '';
}

export function createContentRendererMatches<T>(renderers: Record<string, T>) {
  return Object.entries(renderers).map(([type, renderer]) => ({
    find: (_message: unknown, content: { type?: string }) => {
      if (content.type === type) return true;
      // GenUI legacy plain-text chunks vs TinyRobot OpenAI-style `{ type: 'text', text }`
      if (type === 'custom-text' && content.type === 'text') return true;
      return false;
    },
    renderer,
  }));
}

export function isGroupedFooterFinished(options: {
  role?: string;
  messageIndexes: number[];
  messagesLength: number;
  generating: boolean;
}) {
  return (
    options.role !== 'assistant' ||
    !options.messageIndexes.includes(options.messagesLength - 1) ||
    !options.generating
  );
}

const THINKING_PROCESS_TYPES = new Set(['tool', 'reasoning']);

/**
 * When `showThinkingResult` is false, hide tool/reasoning (and pre-card markdown) in the bubble UI.
 * Matches 0.3 behavior: keep schema-card / final answer visible, drop intermediate steps.
 */
export function filterBubbleMessagesForThinkingDisplay(
  messages: ChatMessage[],
  showThinkingResult?: boolean,
): ChatMessage[] {
  if (showThinkingResult !== false) {
    return messages;
  }

  return messages.map((message) => {
    if (message.role !== 'assistant') {
      return message;
    }

    const withItems = message as ChatMessage & { messages?: IMessageItem[] };
    const items = withItems.messages;
    if (!Array.isArray(items) || items.length === 0) {
      return message;
    }

    const hasSchemaCard = items.some(
      (item) => typeof item.type === 'string' && item.type.startsWith('schema-card'),
    );

    const filtered = items.filter((item) => {
      const type = item.type;
      if (typeof type === 'string' && THINKING_PROCESS_TYPES.has(type)) {
        return false;
      }
      if (hasSchemaCard && (type === 'markdown' || type === 'custom-text' || type === 'text')) {
        return false;
      }
      return true;
    });

    if (filtered.length === items.length) {
      return message;
    }

    return { ...withItems, messages: filtered };
  });
}

export function applyStreamingPlaceholders(
  messages: ChatMessage[],
  options: {
    generating: boolean;
    requestState?: string;
    thinkingText: string;
    loadingItem?: Record<string, unknown>;
  },
): ChatMessage[] {
  const current = messages;
  if (options.requestState === 'processing' && current.at(-1)?.role === 'user') {
    return [
      ...current,
      { role: 'assistant', content: options.thinkingText, loading: true } as ChatMessage,
    ];
  }

  const last = current.at(-1) as (ChatMessage & { messages?: IMessageItem[] }) | undefined;
  if (!options.generating || last?.role !== 'assistant') return current;

  const contents = last.messages ?? [];
  if (contents.some((item) => item.type === 'loading-text')) return current;

  return [
    ...current.slice(0, -1),
    {
      ...last,
      messages: [
        ...contents,
        {
          type: 'loading-text',
          content: '',
          ...options.loadingItem,
        },
      ],
    },
  ];
}

export function buildSenderUserMessage(options: {
  text: string;
  structuredData?: TemplateItem[];
  attachments: FileMeta[];
  apiContent?: any[];
}): ChatMessage & { messages?: IMessageItem[] } {
  const data = Array.isArray(options.structuredData) ? options.structuredData : [];
  const userMessage: ChatMessage & { messages?: IMessageItem[] } = {
    role: 'user',
    content: options.text,
  };

  if (!options.attachments.length) {
    return userMessage;
  }

  userMessage.content = data.map((item) =>
    item.type === 'block'
      ? options.apiContent?.find((attachment: { filename?: string }) => attachment.filename === item.content)
      : { type: 'text', text: item.content },
  ) as unknown as ChatMessage['content'];
  userMessage.messages = [
    {
      type: 'templateData',
      templateData: data,
      attachments: options.attachments.slice(),
      content: '',
    },
  ];

  return userMessage;
}
