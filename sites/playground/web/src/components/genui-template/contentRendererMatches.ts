import { markRaw } from 'vue';
import {
  BubbleRendererMatchPriority,
  BubbleRenderers,
  type BubbleContentRendererMatch,
  type BubbleMessage,
} from '@opentiny/tiny-robot';
import JsonPatchItemRenderer from './JsonPatchItemRenderer.vue';
import SchemaCardItemRenderer from './SchemaCardItemRenderer.vue';
import LoadingTextItemRenderer from './LoadingTextItemRenderer.vue';

type GenuiBubbleMessage = {
  content?: unknown;
  messages?: Array<{ type?: string; content?: string }>;
};

const buildResolvedContent = (message: GenuiBubbleMessage) => {
  if (Array.isArray(message.messages) && message.messages.length > 0) {
    return message.messages;
  }
  return message.content;
};

export const templateContentResolver = (message: BubbleMessage) =>
  buildResolvedContent(message as GenuiBubbleMessage) as BubbleMessage['content'];

export const templateContentRendererMatches: BubbleContentRendererMatch[] = [
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'schema-card',
    renderer: markRaw(SchemaCardItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'json-patch',
    renderer: markRaw(JsonPatchItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'markdown',
    renderer: markRaw(BubbleRenderers.Markdown),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'loading-text',
    renderer: markRaw(LoadingTextItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'error-text',
    renderer: markRaw(BubbleRenderers.Text),
  },
];
