const never = new Promise(() => { });
export function mergeStreams(streams: ReadableStream<string>[]): ReadableStream<{ value: string, type: number }> {
  const readers = streams.map(s => s.getReader());
  const reads: any = streams.map(() => null);
  const dones: (Function)[] = [];
  const allDone = Promise.all(streams.map(s => new Promise(resolve => {
    dones.push(resolve);
  })));

  return new ReadableStream({
    start: controller => {
      allDone.then(() => {
        controller.close();
      });
    },
    pull: controller =>
      Promise.race(
        readers.map((r, i) =>
          reads[i] ??= r.read().then(({ value, done }) => {
            if (done) {
              dones[i]();
              return never;
            }

            controller.enqueue({ value, type: i });
            reads[i] = null;
            return;
          })
        )
      ),
    cancel: reason => {
      for (const reader of readers) {
        reader.cancel(reason);
      }
    },
  });
};
