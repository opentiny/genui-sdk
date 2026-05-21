import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function getSSEToTextTransformer(): Transformer<string, string> {
  return {
    transform(chunk: string, controller: TransformStreamDefaultController<string>) {
      if (chunk.startsWith('data: ')) {
        const data = chunk.slice(6);
        if (data.trim() === '[DONE]') {
          return;
        }
        if (data.trim() === '[ABORTED]') {
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(content);
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      } else {
        console.warn('invalidate format:', chunk)
      }
    }
  }
}
export async function getFileContent(relativePath: string): Promise<string> {
  return fs.readFile(path.join(fileURLToPath(import.meta.url), '../../', relativePath), 'utf-8');
}
export async function readReplay(relativePath: string): Promise<ReadableStream<string>> {
  const stream = new TransformStream(getSSEToTextTransformer())
  const writer = stream.writable.getWriter();
  const text = await getFileContent(relativePath);

  const data = text.split(/\r?\n\r?\n/);
  async function writeData() {
    for await (const item of data) {
      writer.write(item.trim() + '\n\n');
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    writer.close();
  }
  writeData(); // do not await
  return stream.readable;
}

