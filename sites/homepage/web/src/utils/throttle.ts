export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      return;
    }

    const context = this;
    timer = setTimeout(() => {
      timer = null;
      fn.apply(context, args);
    }, delay);
  };
}