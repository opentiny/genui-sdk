import {
  NOTIFY_CONTEXT_KEY,
  type NotifyHandler,
  type NotifyOptions,
} from '../renderer-settings';
import { showDomToast, fallbackNotify } from './notify-dom';

export type { NotifyOptions, NotifyType, NotifyHandler } from '../renderer-settings';
export { NOTIFY_CONTEXT_KEY };

export function Notify(options: NotifyOptions, ctx?: Record<PropertyKey, any>): void {
  try {
    const settings = ctx?.[NOTIFY_CONTEXT_KEY] as { notify?: NotifyHandler } | undefined;
    const custom = settings?.notify;
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
