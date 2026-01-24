import type{ IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import getRawBody from 'raw-body';
import type { IRequestOptions, ChatCompletionCreateParamsBase } from '@opentiny/genui-sdk-chat-completions';
export interface IChatCompletionHandlerConfig {
  chatCompletions: (
    params: ChatCompletionCreateParamsBase,
    options?: IRequestOptions,
  ) => Promise<Response>;
}

export class GenUIChatAPIError extends Error {
  name: string;
  status: number;
  statusText: string;
  code: string;
  constructor(message: string, status: number, statusText: string, code: string) {
    super(message);
    this.status = status;
    this.statusText = statusText;
    this.code = code;
    this.name = 'GenUIChatAPIError';
  }
}

const handleStreamError = (err: Error | unknown, res: ServerResponse) => {
  if ((err as Error)?.name === 'AbortError' || res.writableEnded || res.destroyed) {
    console.error('Stream has been aborted or closed');
    return;
  }
  console.error('Stream error:', err);
};

const formatError = (error: unknown) => {
  const { message, type, param, code, status } = error as any || {};
  const statusCode = typeof status === 'number' ? status : 500;
  const errorResponse = {
    detail: JSON.stringify(error),
    message: message || 'Internal Server Error',
    type: type || null,
    param: param || null,
    code: code || String(statusCode),
  };
  return errorResponse;
};

export function createChatCompletionHandler(config: IChatCompletionHandlerConfig) {
  const { chatCompletions } = config;

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const abortController = new AbortController();

    // let isClientClosed = false; // TODO: 确认(err as Error)?.name === 'AbortError' 有效
    res.on('close', () => {
      // isClientClosed = true;
      abortController.abort();
    });

    try {
      const rawBody = await getRawBody(req, { encoding: 'utf-8' });
      const reqBody: ChatCompletionCreateParamsBase = JSON.parse(rawBody);

      const response = await chatCompletions(reqBody, { signal: abortController.signal });
 
      if (!response.ok || !response.body) {
        const errorBody = await response.text().catch(() => '');
        const message = `Request failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`;
        throw new GenUIChatAPIError(message, response.status, response.statusText, String(response.status));
      }

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        const bodyStream = response.body as ReadableStream<Uint8Array>;
        const readable = Readable.fromWeb(bodyStream);
        readable.on('error', (err: Error) => handleStreamError(err, res));
        readable.pipe(res);
      } else {
        throw new Error('Response body is not a valid stream');
      }
    } catch (error: unknown) {
      console.error('Error in chat-completion handler try/catch:', error, (error as Error)?.message);

      if (res.headersSent) {
        res.write('data: ' + JSON.stringify({ error: formatError(error) }) + '\n\n');
        res.end();
      } else {
        res.statusCode = (error as GenUIChatAPIError).status || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(formatError(error)));
      }
    }
  };
  return { handler };
}
