import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import getRawBody from 'raw-body';
import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { IOpenaiCompatibleRequestOptions } from '../types';

export interface IChatCompletionHandlerConfig {
  chatCompletions: (
    params: ChatCompletionCreateParamsBase,
    options?: IOpenaiCompatibleRequestOptions,
  ) => AsyncIterable<any>;
}

/**
 * 创建聊天补全请求处理函数（通用 Node HTTP 版本）
 * 仅依赖 Node 原生的 IncomingMessage / ServerResponse，不依赖 Express
 */
export function createChatCompletionHandler(config: IChatCompletionHandlerConfig) {
  const { chatCompletions } = config;

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const abortController = new AbortController();
    let hasError = false;

    let isClientClosed = false;
    res.on('close', () => {
      isClientClosed = true;
      abortController.abort();
    });

    // 处理流错误的通用函数
    const handleStreamError = (err: Error | unknown, sourceStream?: any) => {

      // 如果客户端已经关闭或响应已结束，忽略错误
      if (isClientClosed || res.writableEnded || res.destroyed) {
        console.error('Stream has been aborted or closed');
        return;
      }
      console.error('Stream error:', err);
    };

    try {
      const rawBody = await getRawBody(req, { encoding: 'utf-8' });
      const body: ChatCompletionCreateParamsBase = JSON.parse(rawBody);

      const stream = await chatCompletions(body, { signal: abortController.signal });

      // 如果返回的是 Response 对象（检查是否有 body、ok、status 等 Response 特征属性）
      // 使用更可靠的方式检查，因为 instanceof 可能在不同环境中失效
      if (stream && typeof stream === 'object' && 'body' in stream && 'ok' in stream && 'status' in stream) {
        const response = stream as unknown as Response;
        if (!response.ok || !response.body) {
          const errorBody = await response.text().catch(() => '');
          const error = new Error(
            `Request failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
          ) as Error & { status: number; statusText: string; code: string };
          error.status = response.status;
          error.statusText = response.statusText;
          error.code = String(response.status);
          throw error;
        }

        res.setHeader('Content-Type', 'text/event-stream');

        // 将 response.body 转换为 Node.js ReadableStream 并直接 pipe
        // response.body 可能是 Web ReadableStream 或其他类型的流
        // Readable.fromWeb 可以处理 Web ReadableStream，如果是 Node.js ReadableStream 则直接使用
        const bodyStream = response.body;
        if (bodyStream && typeof bodyStream === 'object' && 'getReader' in bodyStream) {
          // 是 Web ReadableStream，需要转换
          const readableStream = Readable.fromWeb(bodyStream as unknown as ReadableStream<any>);

          // 处理流的错误事件，避免未处理的错误
          readableStream.on('error', (err) => handleStreamError(err, readableStream));

          readableStream.pipe(res);
        } else if (bodyStream && typeof (bodyStream as any).pipe === 'function') {
          // 已经是 Node.js ReadableStream，直接 pipe
          const nodeStream = bodyStream as any;

          // 处理流的错误事件
          nodeStream.on('error', (err: Error) => handleStreamError(err, nodeStream));

          nodeStream.pipe(res);
        } else {
          throw new Error('Response body is not a valid stream');
        }

        // pipe 会自动处理流的结束，所以这里直接返回
        return;
      }

      // 如果是 AsyncIterable，按原来的方式处理
      // 以 SSE 格式返回
      res.setHeader('Content-Type', 'text/event-stream');

      for await (const chunk of stream) {
        res.write('data: ' + JSON.stringify(chunk) + '\n\n');
        // TODO: 工具调用情况下最后一个chunk的finish_reason为空，agent不会调用工具，暂时删除最后一个chunk处理
        // if (chunk && chunk.choices?.[0]) {
        //   res.write('data: ' + JSON.stringify(chunk) + '\n\n');
        // }
      }
    } catch (error: any) {
      hasError = true;
      console.error('Error in chat-completion handler try/catch:', error, error?.message);

      const { message, type, param, code, status } = error || {};
      const statusCode = typeof status === 'number' ? status : 500;
      const errorResponse = {
        detail: JSON.stringify(error),
        message: message || 'Internal Server Error',
        type: type || null,
        param: param || null,
        code: code || String(statusCode),
      };

      // 如果已经开始写入 SSE，则继续以 SSE 形式返回错误
      if (res.headersSent) {
        res.write('data: ' + JSON.stringify({ error: errorResponse }) + '\n\n');
        res.end();
      } else {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(errorResponse));
      }
      return;
    }

    if (hasError) {
      return;
    }

    // 正常结束时返回 [DONE]
    res.write('data: [DONE]\n\n');
    res.end();
  };

  return { handler };
}
