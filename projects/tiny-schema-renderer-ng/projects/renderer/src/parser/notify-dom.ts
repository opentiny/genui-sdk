import type { NotifyOptions, NotifyType } from '../renderer-settings';

const ROOT_ID = 'genui-notify-root';
const STYLE_ID = 'genui-notify-style';
const DEFAULT_DURATION = 4500;
const ANIM_MS = 300;

// 配色 / 图标对齐 TinyVue Notify：https://opentiny.design/tiny-vue/zh-CN/os-theme/components/notify
const TYPE_COLOR: Record<NotifyType, string> = {
  success: '#5cb300',
  warning: '#ff8800',
  error: '#f23030',
  info: '#1476ff',
};

const TYPE_ICON: Record<NotifyType, string> = {
  success:
    '<svg viewBox="0 0 16 16" width="24" height="24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.14 7-7-3.14-7-7-7Z"/><path fill="#fff" fill-rule="evenodd" d="M10.38 5.97c.18-.16.46-.16.63 0a.5.5 0 0 1 0 .65L7.73 9.9c-.18.17-.4.26-.63.26s-.46-.09-.65-.26L4.97 8.42a.487.487 0 0 1 0-.64c.18-.16.46-.16.64 0l1.48 1.48 3.28-3.28Z"/></svg>',
  warning:
    '<svg viewBox="0 0 16 16" width="24" height="24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="m8.84 1.5 6.04 11.13c.25.45.07 1.02-.39 1.26-.14.08-.29.12-.45.12H1.95c-.53 0-.95-.42-.95-.94 0-.16.03-.31.11-.44L7.15 1.5c.25-.46.83-.63 1.29-.38.17.08.31.22.4.38Z"/><path fill="#fff" fill-rule="evenodd" d="M8 12.01a.749.749 0 1 1 0-1.5c.42 0 .75.33.75.75s-.34.75-.75.75Zm0-7c.28 0 .5.22.5.5v3.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-3.5c0-.28.22-.5.5-.5Z"/></svg>',
  error:
    '<svg viewBox="0 0 16 16" width="24" height="24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.14 7-7-3.14-7-7-7Z"/><path fill="#fff" fill-rule="evenodd" d="M10.62 4.9c.13 0 .24.05.34.14.09.09.14.2.14.34s-.05.24-.14.34L8.67 8.01l2.29 2.29c.09.09.14.2.14.34a.476.476 0 0 1-.48.48c-.14 0-.24-.05-.34-.14L7.99 8.69 5.7 10.98c-.09.09-.2.14-.34.14a.476.476 0 0 1-.48-.48c0-.14.05-.24.14-.34l2.29-2.29-2.29-2.29c-.09-.09-.14-.2-.14-.34a.476.476 0 0 1 .48-.48c.14 0 .24.05.34.14l2.29 2.29 2.29-2.29c.09-.09.2-.14.34-.14Z"/></svg>',
  info: '<svg viewBox="0 0 14 14" width="24" height="24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z"/><path fill="#fff" fill-rule="evenodd" d="M7.57 6.43v4a.57.57 0 1 1-1.14 0v-4a.57.57 0 1 1 1.14 0zM7 3c-.47 0-.86.38-.86.86s.39.85.86.85.86-.38.86-.86S7.47 3 7 3z"/></svg>',
};

export function fallbackNotify(options: NotifyOptions): void {
  console.warn('[Notify]', options);
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${ROOT_ID}{position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;pointer-events:none;width:340px;max-width:calc(100vw - 32px)}
.genui-notify{pointer-events:auto;display:flex;align-items:flex-start;gap:12px;width:100%;box-sizing:border-box;padding:14px 16px;margin:0 0 12px;border-radius:8px;background:#fff;border:1px solid #ebeef5;box-shadow:0 6px 16px 0 rgba(0,0,0,.08),0 3px 6px -4px rgba(0,0,0,.12),0 9px 28px 8px rgba(0,0,0,.05);font:14px/1.4 system-ui,-apple-system,sans-serif;color:#303133;opacity:0;transform:translateX(100%);transition:opacity ${ANIM_MS}ms ease,transform ${ANIM_MS}ms ease,height ${ANIM_MS}ms ease,padding ${ANIM_MS}ms ease,margin ${ANIM_MS}ms ease,border-width ${ANIM_MS}ms ease}
.genui-notify--enter{opacity:1;transform:translateX(0)}
.genui-notify--leaving{opacity:0;transform:translateY(-12px);padding-top:0;padding-bottom:0;margin-bottom:0;border-width:0}
.genui-notify__icon{flex:none;width:24px;height:24px;margin-top:1px;line-height:0}
.genui-notify__icon svg{display:block}
.genui-notify__body{flex:1;min-width:0}
.genui-notify__title{font-weight:600;font-size:16px;line-height:24px;color:#303133}
.genui-notify__message{margin-top:4px;font-size:14px;line-height:1.5;color:#606266;word-break:break-word;max-height:96px;overflow:auto}
.genui-notify__close{flex:none;margin:-4px -6px 0 0;border:0;background:transparent;cursor:pointer;color:#909399;font-size:18px;line-height:1;padding:4px;border-radius:4px}
.genui-notify__close:hover{color:#606266;background:#f5f7fa}
.genui-notify--success .genui-notify__icon{color:${TYPE_COLOR.success}}
.genui-notify--warning .genui-notify__icon{color:${TYPE_COLOR.warning}}
.genui-notify--error .genui-notify__icon{color:${TYPE_COLOR.error}}
.genui-notify--info .genui-notify__icon{color:${TYPE_COLOR.info}}
`;
  document.head.appendChild(style);
}

function ensureRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

function createToastElement(options: NotifyOptions): HTMLElement {
  const type: NotifyType = options.type ?? 'info';
  const el = document.createElement('div');
  el.className = `genui-notify genui-notify--${type}`;
  el.setAttribute('role', 'alert');

  const icon = document.createElement('div');
  icon.className = 'genui-notify__icon';
  icon.innerHTML = TYPE_ICON[type];

  const body = document.createElement('div');
  body.className = 'genui-notify__body';
  if (options.title) {
    const title = document.createElement('div');
    title.className = 'genui-notify__title';
    title.textContent = options.title;
    body.appendChild(title);
  }
  if (options.message) {
    const msg = document.createElement('div');
    msg.className = 'genui-notify__message';
    msg.textContent = options.message;
    body.appendChild(msg);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'genui-notify__close';
  closeBtn.setAttribute('aria-label', 'close');
  closeBtn.textContent = '×';

  el.append(icon, body, closeBtn);
  return el;
}

function bindAutoDismiss(el: HTMLElement, duration: number, closeBtn: HTMLButtonElement): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  const remove = () => {
    clearTimer();
    if (el.classList.contains('genui-notify--leaving')) return;
    el.style.height = `${el.offsetHeight}px`;
    void el.offsetHeight;
    el.classList.remove('genui-notify--enter');
    el.classList.add('genui-notify--leaving');
    el.style.height = '0';
    setTimeout(() => el.remove(), ANIM_MS);
  };
  const scheduleRemove = () => {
    clearTimer();
    if (duration > 0) {
      timer = setTimeout(remove, duration);
    }
  };
  closeBtn.addEventListener('click', remove);
  el.addEventListener('mouseenter', clearTimer);
  el.addEventListener('mouseleave', scheduleRemove);
  scheduleRemove();
}

export function showDomToast(options: NotifyOptions): void {
  ensureStyle();
  const el = createToastElement(options);
  const closeBtn = el.querySelector('.genui-notify__close') as HTMLButtonElement;
  ensureRoot().appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('genui-notify--enter'));
  });
  bindAutoDismiss(el, options.duration ?? DEFAULT_DURATION, closeBtn);
}
