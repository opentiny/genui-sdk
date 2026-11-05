import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import type { NotifyHandler } from '../config-provider';
import type { IRendererProps } from '../renderer';
import { GenuiConfigRenderer } from './GenuiConfigRenderer';
import { parseBooleanAttribute, parseJsonAttribute } from './parse-attribute';

type RendererProps = Partial<Omit<IRendererProps, 'content'>> & {
  content?: IRendererProps['content'];
  notify?: NotifyHandler;
};

type PropName = keyof RendererProps;

/** attribute 名 → React props 名；不在这里的只能走 property（比如组件、函数） */
const ATTRIBUTE_TO_PROP = {
  content: 'content',
  generating: 'generating',
  'is-json-complete': 'isJsonComplete',
  'required-complete-field-selectors': 'requiredCompleteFieldSelectors',
  state: 'state',
  id: 'id',
} as const satisfies Record<string, PropName>;

type AttributeName = keyof typeof ATTRIBUTE_TO_PROP;

function readAttribute(name: AttributeName, value: string | null): unknown {
  switch (name) {
    // content 保留原始字符串：流式输出时是半截 JSON，交给渲染器里的 repairJson 处理
    case 'content':
      return value ?? undefined;
    case 'generating':
    case 'is-json-complete':
      return parseBooleanAttribute(value ?? undefined);
    case 'required-complete-field-selectors':
      return parseJsonAttribute<string[]>(value ?? undefined);
    case 'state':
      return parseJsonAttribute<Record<string, unknown>>(value ?? undefined);
    default:
      return value ?? undefined;
  }
}

/** property 赋值时把 JSON 字符串收敛成对象，避免把字符串塞给只接受对象的渲染器 props */
function normalizePropertyValue(name: PropName, value: unknown): unknown {
  if (name === 'content') return value;
  if (name === 'generating' || name === 'isJsonComplete') return parseBooleanAttribute(value as boolean | string);
  if (name === 'state') return parseJsonAttribute<Record<string, unknown>>(value as string | Record<string, unknown>);
  if (name === 'requiredCompleteFieldSelectors') return parseJsonAttribute<string[]>(value as string | string[]);
  return value;
}

/**
 * 创建 GenUI 渲染器的自定义元素构造函数。
 *
 * React 没有 Vue 的 `defineCustomElement`，这里手写一个 `HTMLElement`：
 * - 物料是构建期确定的对象，通过闭包传进来，不作为 attribute
 * - 用 light DOM（不挂 shadow root），全局主题变量与物料样式才能生效
 * - React root 挂在内部容器上，卸载时 `unmount()`，多次插入/移除可以复用
 */
export function createGenuiConfigRendererElement(materials: IMaterials = {}): CustomElementConstructor {
  return class GenuiConfigRendererElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return Object.keys(ATTRIBUTE_TO_PROP);
    }

    #props: RendererProps = {};

    #root: Root | null = null;

    #container: HTMLElement | null = null;

    connectedCallback(): void {
      if (typeof document === 'undefined') return;
      if (!this.#container) {
        this.#container = document.createElement('div');
        this.#container.className = 'genui-config-renderer-container';
        this.#container.style.display = 'block';
        this.appendChild(this.#container);
      }
      if (!this.#root) {
        this.#root = createRoot(this.#container);
      }
      this.#render();
    }

    disconnectedCallback(): void {
      this.#root?.unmount();
      this.#root = null;
      this.#container?.remove();
      this.#container = null;
    }

    attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
      if (oldValue === value || !(name in ATTRIBUTE_TO_PROP)) return;
      const attribute = name as AttributeName;
      this.#setProp(ATTRIBUTE_TO_PROP[attribute], readAttribute(attribute, value));
    }

    get content(): RendererProps['content'] {
      return this.#props.content;
    }

    set content(value: RendererProps['content']) {
      this.#setProp('content', value);
    }

    get generating(): boolean | undefined {
      return this.#props.generating;
    }

    set generating(value: boolean | string | undefined) {
      this.#setProp('generating', value);
    }

    get isJsonComplete(): boolean | undefined {
      return this.#props.isJsonComplete;
    }

    set isJsonComplete(value: boolean | string | undefined) {
      this.#setProp('isJsonComplete', value);
    }

    get customComponents(): RendererProps['customComponents'] {
      return this.#props.customComponents;
    }

    set customComponents(value: RendererProps['customComponents']) {
      this.#setProp('customComponents', value);
    }

    get customActions(): RendererProps['customActions'] {
      return this.#props.customActions;
    }

    set customActions(value: RendererProps['customActions']) {
      this.#setProp('customActions', value);
    }

    get requiredCompleteFieldSelectors(): RendererProps['requiredCompleteFieldSelectors'] {
      return this.#props.requiredCompleteFieldSelectors;
    }

    set requiredCompleteFieldSelectors(value: RendererProps['requiredCompleteFieldSelectors'] | string) {
      this.#setProp('requiredCompleteFieldSelectors', value);
    }

    get state(): RendererProps['state'] {
      return this.#props.state;
    }

    set state(value: RendererProps['state'] | string) {
      this.#setProp('state', value);
    }

    get notify(): NotifyHandler | undefined {
      return this.#props.notify;
    }

    set notify(value: NotifyHandler | undefined) {
      this.#setProp('notify', value);
    }

    /** 没有传入 notify 时，把通知转成 DOM 事件，方便纯 HTML 宿主监听 */
    #dispatchNotify = (payload: Parameters<NotifyHandler>[0]): void => {
      this.dispatchEvent(new CustomEvent('genui-notify', { detail: payload, bubbles: true, composed: true }));
    };

    #setProp(name: PropName, value: unknown): void {
      (this.#props as Record<string, unknown>)[name] = normalizePropertyValue(name, value);
      this.#render();
    }

    #render(): void {
      if (!this.#root) return;
      this.#root.render(
        createElement(GenuiConfigRenderer, {
          materials,
          ...this.#props,
          notify: this.#props.notify ?? this.#dispatchNotify,
        }),
      );
    }
  };
}
