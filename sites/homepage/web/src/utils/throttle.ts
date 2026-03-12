export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastTime = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const elapsed = now - lastTime;

    // 如果距离上次执行时间超过 delay，立即执行
    if (elapsed >= delay) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else {
      // 否则，清除之前的定时器，设置新的定时器，确保最后一次调用也会执行
      if (timer) {
        clearTimeout(timer);
      }
      const remaining = delay - elapsed;
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}