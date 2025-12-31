export class EventEmitter {
  private events: Record<string, { callback: Function; once: boolean }[]> = {};
  constructor() {
    this.events = Object.create(null);
  }

  /**
   * @param {string} eventName - 事件名
   * @param {Function} callback - 回调函数
   * @param {boolean} [once=false] - 是否只触发一次
   */
  on(eventName: string, callback: Function, once = false) {
    if (typeof callback !== 'function') {
      throw new TypeError('回调必须是函数');
    }
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push({ callback, once });
  }

  /**
   * @param {string} eventName - 事件名
   * @param {Function} callback - 要移除的回调（必须是注册时的同一个函数引用）
   */
  off(eventName: string, callback: Function) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter((item) => item.callback !== callback);
    if (this.events[eventName].length === 0) {
      delete this.events[eventName];
    }
  }

  /**
   * @param {string} eventName - 事件名
   * @param  {...any} args - 传递给回调的参数
   */
  emit(eventName: string, ...args: any[]) {
    if (!this.events[eventName]) return;
    const callbacks = [...this.events[eventName]];

    callbacks.forEach((item, index) => {
      const { callback, once } = item;
      callback.apply(this, args);

      if (once) {
        this.events[eventName].splice(index, 1);
      }
    });

    if (this.events[eventName].length === 0) {
      delete this.events[eventName];
    }
  }

  /**
   * @param {string} eventName - 事件名
   * @param {Function} callback - 回调函数
   */
  once(eventName: string, callback: Function) {
    this.on(eventName, callback, true);
  }
}
const emitter = new EventEmitter();
export { emitter };
