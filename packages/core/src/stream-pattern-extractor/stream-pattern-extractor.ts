import { PatternExtractor } from "./pattern-extractor";
export class StreamPatternExtractor {
  static separate(stream: ReadableStream<string>): [ReadableStream<string>, ReadableStream<string>] {
    const patternExtractor = new StreamPatternExtractor();
    Promise.resolve().then(() => patternExtractor.handleStream(stream));
    return [patternExtractor.normalStream, patternExtractor.handledStream];
  }
  protected normalTransformStream: TransformStream<string, string> = new TransformStream();
  protected handledTransformStream: TransformStream<string, string>= new TransformStream();
  protected normalWriter: WritableStreamDefaultWriter<string> = this.normalTransformStream.writable.getWriter();
  protected handledWriter: WritableStreamDefaultWriter<string> = this.handledTransformStream.writable.getWriter();
  protected patternExtractor: PatternExtractor;
  protected isStarted = false;
  protected startResolve: (() => void )| null = null;
  protected startPromise: Promise<void> | null = new Promise<void>((resolve) => {
    this.startResolve = resolve;
  });
  

  public get normalStream() {
    return this.normalTransformStream.readable;
  }
  public get handledStream() {
    return this.handledTransformStream.readable;
  }
  constructor() {
    this.patternExtractor = new PatternExtractor({
      onNormalWrite: (value) => {
        this.writeNormalStream(value);
      },
      onHandledWrite: (value) => {
        this.writeHandledStream(value);
      },
    });
   
  }

  protected reset() {
    this.normalTransformStream = new TransformStream();
    this.handledTransformStream = new TransformStream();
    this.normalWriter = this.normalTransformStream.writable.getWriter();
    this.handledWriter = this.handledTransformStream.writable.getWriter();
    this.patternExtractor.reset();
  }

  protected async writeNormalStream(value: string) {
    await this.normalWriter.ready;
    await this.normalWriter.write(value);
  }
  protected async writeHandledStream(value: string) {
    await this.handledWriter.ready;
    await this.handledWriter.write(value);
  }

  protected async closeStream() {
    if (this.normalWriter) {
      this.normalWriter.releaseLock();
    }
    if (this.handledWriter) {
      this.handledWriter.releaseLock();
    }

    if (this.normalTransformStream) {
      await this.normalTransformStream.writable.close();
    }

    if (this.handledTransformStream) {
      await this.handledTransformStream.writable.close();
    }
  }

  async handleStream(stream: ReadableStream<string>) {
    const reader = stream.getReader();
    while (true) {
      const { done, value: content } = await reader.read();
      if (done) break;
      this.patternExtractor.handleContent(content);
    }
    await this.closeStream();
  }   
}