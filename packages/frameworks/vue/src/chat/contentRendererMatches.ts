import { markRaw } from 'vue';
import {
  BubbleRendererMatchPriority,
  type BubbleContentRendererMatch,
  type BubbleMessage,
} from '@opentiny/tiny-robot';
import MarkdownItemRenderer from './renderer/MarkdownItemRenderer.vue';
import CustomTextItemRenderer from './renderer/CustomTextItemRenderer.vue';
import ReasoningItemRenderer from './renderer/ReasoningItemRenderer.vue';
import ToolItemRenderer from './renderer/ToolItemRenderer.vue';
import ErrorTextItemRenderer from './renderer/ErrorTextItemRenderer.vue';
import LoadingTextItemRenderer from './renderer/LoadingTextItemRenderer.vue';
import SchemaCardItemRenderer from './renderer/SchemaCardItemRenderer.vue';
import TemplateDataItemRenderer from './renderer/TemplateDataItemRenderer.vue';

type GenuiBubbleMessage = BubbleMessage & {
  messages?: Array<{ type?: string; content?: string; thinking?: boolean }>;
  reasoning_content?: string;
  state?: { thinking?: boolean };
};

type GenuiContentItem = { type?: string; content?: string; thinking?: boolean };

const mergeReasoningItems = (items: GenuiContentItem[]): GenuiContentItem[] => {
  const reasoningItems = items.filter((item) => item?.type === 'reasoning');
  if (reasoningItems.length <= 1) {
    return items;
  }

  const mergedReasoning: GenuiContentItem = {
    type: 'reasoning',
    content: reasoningItems.map((item) => item.content ?? '').join(''),
    thinking: reasoningItems.some((item) => item.thinking),
  };

  const result: GenuiContentItem[] = [];
  let merged = false;
  for (const item of items) {
    if (item?.type === 'reasoning') {
      if (!merged) {
        result.push(mergedReasoning);
        merged = true;
      }
      continue;
    }
    result.push(item);
  }
  return result;
};

const buildResolvedContent = (message: GenuiBubbleMessage): BubbleMessage['content'] => {
  let items: GenuiContentItem[] = Array.isArray(message.messages) ? [...message.messages] : [];
  items = mergeReasoningItems(items);

  const hasReasoningItem = items.some((item) => item?.type === 'reasoning');
  if (!hasReasoningItem && typeof message.reasoning_content === 'string' && message.reasoning_content.trim()) {
    items.unshift({
      type: 'reasoning',
      content: message.reasoning_content,
      thinking: message.state?.thinking ?? false,
    });
  }

  if (items.length > 0) {
    return items as BubbleMessage['content'];
  }

  return message.content;
};

export const genuiContentResolver = (message: BubbleMessage) => {
  return buildResolvedContent(message as GenuiBubbleMessage);
};

export const genuiContentRendererMatches: BubbleContentRendererMatch[] = [
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    find: (_message, content) => content?.type === 'schema-card',
    renderer: markRaw(SchemaCardItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'templateData',
    renderer: markRaw(TemplateDataItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'markdown',
    renderer: markRaw(MarkdownItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'custom-text',
    renderer: markRaw(CustomTextItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    find: (_message, content) => content?.type === 'reasoning',
    renderer: markRaw(ReasoningItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'tool',
    renderer: markRaw(ToolItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'error-text',
    renderer: markRaw(ErrorTextItemRenderer),
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => content?.type === 'loading-text',
    renderer: markRaw(LoadingTextItemRenderer),
  },
];
