type Handler = (...args: unknown[]) => void;

/** JSFunction 类型：物料包内联实现的工具类，事件总线，可用于页面内组件间通信 */
export class EventBus {
  private handlers: Record<string, Handler[]> = {};

  /**
   * 监听事件
   * @returns 取消监听函数
   */
  on(event: string, handler: Handler) {
    (this.handlers[event] ??= []).push(handler);
    return () => this.off(event, handler);
  }

  /** 触发事件 */
  emit(event: string, ...args: unknown[]) {
    (this.handlers[event] ?? []).forEach((handler) => handler(...args));
  }

  /** 移除监听 */
  off(event: string, handler: Handler) {
    this.handlers[event] = (this.handlers[event] ?? []).filter((h) => h !== handler);
  }
}
