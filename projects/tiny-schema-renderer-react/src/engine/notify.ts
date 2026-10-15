import { showDomToast, fallbackNotify } from './notify-dom';

export type NotifyType = 'success' | 'warning' | 'error' | 'info';

export interface NotifyOptions {
  type?: NotifyType;
  title?: string;
  message?: string;
  duration?: number;
}

export type NotifyHandler = (options: NotifyOptions) => void;

export const NOTIFY = Symbol('NOTIFY');

export function Notify(options: NotifyOptions, ctx?: Record<PropertyKey, unknown>): void {
  try {
    const custom = ctx?.[NOTIFY];
    if (typeof custom === 'function') {
      custom(options);
      return;
    }
    if (typeof document === 'undefined') {
      fallbackNotify(options);
      return;
    }
    showDomToast(options);
  } catch {
    fallbackNotify(options);
  }
}
