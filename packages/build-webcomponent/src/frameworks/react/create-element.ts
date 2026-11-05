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

/** Coerce JSON strings on property assignment so object-only renderer props never get a string */
function normalizePropertyValue(name: PropName, value: unknown): unknown {
  if (name === 'content') return value;
  if (name === 'generating' || name === 'isJsonComplete') return parseBooleanAttribute(value as boolean | string);
  if (name === 'state') return parseJsonAttribute<Record<string, unknown>>(value as string | Record<string, unknown>);
  if (name === 'requiredCompleteFieldSelectors') return parseJsonAttribute<string[]>(value as string | string[]);
  return value;
}

/**
 * Creates the custom element constructor for the GenUI renderer.
 *
 * React has no `defineCustomElement`, so this hand-rolls an `HTMLElement`:
 * - materials are fixed at build time and passed in through the closure, never as an attribute
 * - it renders into light DOM (no shadow root) so global theme variables and materials styles apply
 * - one React root lives on the inner container and is reused across reconnects
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

    /** 没有外部传入 notify 时，把通知转成 DOM 事件，方便纯 HTML 宿主监听 */
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
