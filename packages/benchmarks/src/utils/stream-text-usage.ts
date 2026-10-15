import { streamText } from 'ai';

type StreamTextResult = ReturnType<typeof streamText>;

/**
 * 正数毫秒时返回 `AbortSignal.timeout(ms)`（Node 18+），供 `streamText({ abortSignal })`；否则不限制。
 */
export function benchStreamTextAbortSignal(timeoutMs: number | undefined): AbortSignal | undefined {
  if (timeoutMs == null || timeoutMs <= 0) {
    return undefined;
  }
  return AbortSignal.timeout(timeoutMs);
}

/**
 * 合并多个可选的 AbortSignal（如超时信号 + 用户停止信号）。
 * 任一信号触发即整体中止；只有一个信号时直接复用，避免多余的 `AbortSignal.any` 包装。
 */
export function combineAbortSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const valid = signals.filter((s): s is AbortSignal => s != null);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];
  return AbortSignal.any(valid);
}

/**
 * 用户停止基准运行时抛出统一 AbortError，便于上层（如 UI server）识别并落为「已停止」状态。
 * 与 `abortableSleep` 配合，让等待中的重试/限流也能被立即中断。
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Benchmark stopped by user', 'AbortError');
  }
}

/** 可被外部 signal 中断的 sleep；signal 触发时立即 reject AbortError。 */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Benchmark stopped by user', 'AbortError'));
      return;
    }
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Benchmark stopped by user', 'AbortError'));
    };
    const timer = setTimeout(done, ms);
    function done() {
      cleanup();
      resolve();
    }
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 消费 `fullStream` 后解析最终 token 用量。
 * 部分提供商在流式 `finish` 分片的 `totalUsage` 中字段为空，需在消费流后 `await totalUsage` 才能得到 AI SDK 汇总的用量。
 */
export async function resolveStreamTextUsage(streamResult: StreamTextResult): Promise<{
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
}> {
  try {
    const u = await streamResult.totalUsage;
    return {
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
    };
  } catch {
    return { inputTokens: undefined, outputTokens: undefined, totalTokens: undefined };
  }
}
