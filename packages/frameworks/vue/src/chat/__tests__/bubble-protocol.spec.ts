import { describe, expect, it } from 'vitest';
import type { BubbleMessage, TemplateItem } from '@opentiny/tiny-robot';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import {
  applyStreamingPlaceholders,
  buildSenderUserMessage,
  createContentRendererMatches,
  filterBubbleMessagesForThinkingDisplay,
  getResolvedContent,
  isGroupedFooterFinished,
  resolveBubbleContents,
} from '../bubble-protocol';

describe('bubble protocol', () => {
  it('resolves GenUI messages before falling back to content', () => {
    expect(
      resolveBubbleContents({
        role: 'assistant',
        content: 'fallback',
        messages: [{ type: 'markdown', content: 'hello' }],
      } as BubbleMessage),
    ).toEqual([{ type: 'markdown', content: 'hello' }]);
    expect(resolveBubbleContents({ role: 'user', content: 'plain' } as BubbleMessage)).toBe('plain');
  });

  it('matches content renderers by type, including loading and error', () => {
    const matches = createContentRendererMatches({
      markdown: 'markdown-renderer',
      'loading-text': 'loading-renderer',
      'error-text': 'error-renderer',
      templateData: 'template-renderer',
    });

    expect(matches.find((item) => item.find({}, { type: 'loading-text' }))?.renderer).toBe('loading-renderer');
    expect(matches.find((item) => item.find({}, { type: 'error-text' }))?.renderer).toBe('error-renderer');
    expect(matches.find((item) => item.find({}, { type: 'templateData' }))?.renderer).toBe('template-renderer');
    expect(matches.some((item) => item.find({}, { type: 'unknown' }))).toBe(false);
  });

  it('extracts grouped content by contentIndex', () => {
    expect(
      getResolvedContent({
        message: {
          messages: [
            { type: 'reasoning', content: 'think' },
            { type: 'markdown', content: 'answer' },
          ],
        },
        contentIndex: 1,
      }),
    ).toEqual({ type: 'markdown', content: 'answer' });
  });

  it('falls back to plain string content for index 0', () => {
    expect(
      getResolvedContent({
        message: { role: 'assistant', content: 'hello' },
        contentIndex: 0,
      }),
    ).toEqual({ type: 'text', text: 'hello', content: 'hello' });
  });

  it('matches OpenAI-style text chunks to custom-text renderer', () => {
    const matches = createContentRendererMatches({ 'custom-text': 'text-renderer' });
    expect(matches.find((item) => item.find({}, { type: 'text', text: 'hi' }))?.renderer).toBe('text-renderer');
  });

  it('uses grouped footer indexes to mark only the latest generating assistant', () => {
    expect(
      isGroupedFooterFinished({
        role: 'assistant',
        messageIndexes: [2],
        messagesLength: 3,
        generating: true,
      }),
    ).toBe(false);
    expect(
      isGroupedFooterFinished({
        role: 'assistant',
        messageIndexes: [0],
        messagesLength: 3,
        generating: true,
      }),
    ).toBe(true);
    expect(
      isGroupedFooterFinished({
        role: 'user',
        messageIndexes: [2],
        messagesLength: 3,
        generating: true,
      }),
    ).toBe(true);
  });

  it('hides tool and reasoning items when showThinkingResult is false', () => {
    const input = [
      {
        role: 'assistant',
        content: '',
        messages: [
          { type: 'tool', name: 'search', content: '{}', status: 'success' },
          { type: 'reasoning', content: 'think' },
          { type: 'markdown', content: 'answer' },
        ],
      },
    ] as ChatMessage[];

    const filtered = filterBubbleMessagesForThinkingDisplay(input, false);
    expect((filtered[0] as ChatMessage & { messages: { type: string }[] }).messages.map((i) => i.type)).toEqual([
      'markdown',
    ]);
    expect(filterBubbleMessagesForThinkingDisplay(input, true)).toBe(input);
    expect(filterBubbleMessagesForThinkingDisplay(input, undefined)).toBe(input);
  });

  it('hides intermediate markdown when a schema-card exists and thinking is off', () => {
    const input = [
      {
        role: 'assistant',
        content: '',
        messages: [
          { type: 'tool', name: 'x', content: '{}', status: 'success' },
          { type: 'markdown', content: 'draft' },
          { type: 'schema-card', id: 'c1', content: '{}' },
        ],
      },
    ] as ChatMessage[];

    const filtered = filterBubbleMessagesForThinkingDisplay(input, false);
    expect((filtered[0] as ChatMessage & { messages: { type: string }[] }).messages.map((i) => i.type)).toEqual([
      'schema-card',
    ]);
  });

  it('injects loading placeholders while a request is in flight', () => {
    const waiting = applyStreamingPlaceholders([{ role: 'user', content: 'hi' }], {
      generating: true,
      requestState: 'processing',
      thinkingText: 'thinking',
    });
    expect(waiting.at(-1)).toMatchObject({ role: 'assistant', content: 'thinking', loading: true });

    const streaming = applyStreamingPlaceholders(
      [{ role: 'assistant', content: '', messages: [{ type: 'markdown', content: 'partial' }] } as ChatMessage],
      { generating: true, thinkingText: 'thinking' },
    );
    expect((streaming.at(-1) as ChatMessage & { messages: { type: string }[] }).messages.map((item) => item.type)).toEqual([
      'markdown',
      'loading-text',
    ]);
  });
});

describe('sender protocol', () => {
  it('keeps attachment-only submits as block template data', () => {
    const message = buildSenderUserMessage({
      text: '',
      structuredData: [{ type: 'block', content: 'photo.png' }] as TemplateItem[],
      attachments: [
        {
          name: 'photo.png',
          type: 'image/png',
          size: 4,
          lastModified: 1,
          base64: 'data:image/png;base64,AAAA',
        },
      ],
      apiContent: [{ type: 'image_url', filename: 'photo.png', image_url: { url: 'data:image/png;base64,AAAA' } }],
    });

    expect(message.content).toEqual([
      { type: 'image_url', filename: 'photo.png', image_url: { url: 'data:image/png;base64,AAAA' } },
    ]);
    expect(message.messages).toEqual([
      {
        type: 'templateData',
        templateData: [{ type: 'block', content: 'photo.png' }],
        attachments: [
          {
            name: 'photo.png',
            type: 'image/png',
            size: 4,
            lastModified: 1,
            base64: 'data:image/png;base64,AAAA',
          },
        ],
        content: '',
      },
    ]);
  });
});
