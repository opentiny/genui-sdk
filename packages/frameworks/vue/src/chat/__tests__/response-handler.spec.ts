import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IStreamData } from '@opentiny/genui-sdk-core';
import {
  createResponseHandlerController,
  createResponseHandlerPlugin,
  defaultResponseHandlers,
  type IResponseHandler,
} from '../response-handler';

describe('response handler controller', () => {
  it('runs one lifecycle per turn and mutates the official current message', () => {
    const start = vi.fn((context) => {
      context.started = true;
    });
    const end = vi.fn();
    const handler: IResponseHandler<IStreamData> = {
      name: 'content',
      start,
      end,
      match: () => true,
      handler(chunk, context) {
        context.chatMessage.content += chunk.choices?.[0]?.delta?.content ?? '';
        return true;
      },
    };
    const controller = createResponseHandlerController({
      getHandlers: () => [handler],
      getChatConfig: () => ({}),
    });
    const message: ChatMessage = { role: 'assistant', content: '' };

    controller.handleChunk('turn-1', message, {
      choices: [{ delta: { content: 'hello' } }],
    } as IStreamData);
    controller.handleChunk('turn-1', message, {
      choices: [{ delta: { content: ' world' } }],
    } as IStreamData);
    controller.finish('turn-1', message);

    expect(message.content).toBe('hello world');
    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it('parses schema-card, reasoning and tool results onto the current message', () => {
    const controller = createResponseHandlerController({
      getHandlers: () => defaultResponseHandlers,
      getChatConfig: () => ({ addToolCallContext: true }),
    });
    const message: ChatMessage & { messages?: unknown[] } = { role: 'assistant', content: '', messages: [] };

    controller.handleChunk('turn-2', message, {
      choices: [{ delta: { reasoning_content: 'thinking' } }],
    } as IStreamData);
    controller.handleChunk('turn-2', message, {
      choices: [{ delta: { content: 'hello\n```schemaJson\n{"type":"card"}\n```\n' } }],
    } as IStreamData);
    controller.handleChunk('turn-2', message, {
      choices: [
        {
          delta: {
            tool_calls: [{ id: 'call-1', function: { name: 'search', arguments: '{"q":' } }],
          },
        },
      ],
    } as IStreamData);
    controller.handleChunk('turn-2', message, {
      choices: [{ delta: { tool_calls: [{ function: { arguments: '"hi"}' } }] } }],
    } as IStreamData);
    controller.handleChunk('turn-2', message, {
      choices: [
        {
          delta: {
            tool_calls_result: [{ id: 'call-1', function: { arguments: { q: 'hi' }, result: 'ok' } }],
          },
        },
      ],
    } as IStreamData);
    controller.finish('turn-2', message);

    expect(message.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'reasoning', content: 'thinking', thinking: false }),
        expect.objectContaining({ type: 'markdown', content: expect.stringContaining('hello') }),
        expect.objectContaining({ type: 'schema-card', content: expect.stringContaining('"type":"card"') }),
        expect.objectContaining({
          type: 'tool',
          name: 'search',
          status: 'success',
        }),
      ]),
    );
  });

  it('writes error-text messages and finishes aborted turns through the plugin', () => {
    const finish = vi.fn();
    const fail = vi.fn();
    const plugin = createResponseHandlerPlugin({
      handleChunk: vi.fn(),
      finish,
      fail,
    });
    const appendMessage = vi.fn();

    plugin.onTurnAbort?.({ turnId: 'aborted-turn' } as any);
    plugin.onError?.({
      turnId: 'failed-turn',
      error: new Error('boom'),
      appendMessage,
    } as any);

    expect(finish).toHaveBeenCalledWith('aborted-turn');
    expect(fail).toHaveBeenCalledWith('failed-turn', expect.any(Error));
    expect(appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        messages: [{ type: 'error-text', content: 'boom' }],
      }),
    );
  });
});
