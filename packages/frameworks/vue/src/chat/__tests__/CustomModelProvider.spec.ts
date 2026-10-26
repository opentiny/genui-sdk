import { describe, expect, it } from 'vitest';
import { responseToAsyncGenerator } from '../CustomModelProvider';

describe('responseToAsyncGenerator', () => {
  it('parses split SSE chunks and stops at DONE', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"delta":{"content":"hel'));
        controller.enqueue(encoder.encode('lo"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });

    const chunks = [];
    for await (const chunk of responseToAsyncGenerator(new Response(stream), new AbortController().signal)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      {
        id: '1',
        choices: [{ delta: { content: 'hello' } }],
      },
    ]);
  });

  it('rejects unsuccessful responses', async () => {
    const iterator = responseToAsyncGenerator(new Response(null, { status: 500 }), new AbortController().signal);
    await expect(iterator.next()).rejects.toThrow('HTTP 500');
  });

  it('stops reading after abort', async () => {
    const encoder = new TextEncoder();
    const abort = new AbortController();
    abort.abort();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"delta":{"content":"late"}}]}\n\n'));
        controller.close();
      },
    });

    const chunks = [];
    for await (const chunk of responseToAsyncGenerator(new Response(stream), abort.signal)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([]);
  });
});
