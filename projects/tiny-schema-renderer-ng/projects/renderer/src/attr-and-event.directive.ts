import {
  Directive,
  Input,
  ElementRef,
  SimpleChanges,
  ComponentRef,
  Optional,
  ChangeDetectorRef,
  Self,
  AfterViewInit,
  DoCheck,
  OnDestroy,
} from '@angular/core';
import { toNativeEventName } from './parser/event-utils';
import { ComponentOutlet } from './component-outlet';

@Directive({
  selector: '[attrAndEvent]',
  standalone: true,
})
export class AttrAndEventDirective implements AfterViewInit, DoCheck, OnDestroy {
  @Input() attrs: Record<string, any> = {};
  @Input() events: Record<string, any> = {};

  private boundHost: HTMLElement | null = null;
  private boundEvents: Record<string, any> = {};
  /** Class tokens last applied from schema — removed on update / disappearance. */
  private ownedClassTokens = new Set<string>();
  /** Style property names last applied from schema object form. */
  private ownedStyleProps = new Set<string>();

  /**
   * Host of the created outlet only. Do not fall back to `parent.firstElementChild` —
   * that is often a sibling (e.g. the datepicker input next to an addon).
   */
  get renderHostElement() {
    const el =
      this.componentOutlet['_componentRef']?.location.nativeElement ||
      this.componentRef?.location.nativeElement;
    return el?.addEventListener ? el : null;
  }

  constructor(
    private elementRef: ElementRef,
    @Self() @Optional() private componentRef: ComponentRef<any>,
    private cd: ChangeDetectorRef,
    private componentOutlet: ComponentOutlet,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['attrs']) {
      this.clearAttrs(changes['attrs'].previousValue || {});
      this.updateAttrs();
    }
    if (changes['events']) {
      this.rebindEvents();
    }
  }

  ngAfterViewInit() {
    this.updateAttrs();
    this.rebindEvents();
  }

  ngDoCheck() {
    const host = this.renderHostElement;
    if (host === this.boundHost) {
      return;
    }
    // Host gone (destroyed / comment): drop listeners; do not leave boundHost stale.
    if (!host) {
      this.clearEventsFrom(this.boundHost, this.boundEvents);
      this.boundHost = null;
      this.boundEvents = {};
      this.ownedClassTokens.clear();
      this.ownedStyleProps.clear();
      return;
    }
    // Replacement host: owned tokens belong to the previous element.
    this.ownedClassTokens.clear();
    this.ownedStyleProps.clear();
    this.updateAttrs();
    this.rebindEvents();
  }

  ngOnDestroy() {
    this.clearEventsFrom(this.boundHost, this.boundEvents);
    this.boundHost = null;
    this.boundEvents = {};
    this.ownedClassTokens.clear();
    this.ownedStyleProps.clear();
  }

  updateAttrs() {
    if (!this.renderHostElement?.setAttribute) {
      // 可能为comment类型
      return;
    }
    Object.entries(this.attrs)
      .filter(([attr, value]) => value !== null)
      .forEach(([attr, value]) => {
        this.applyAttr(this.renderHostElement, attr, value);
      });
  }

  private applyAttr(el: HTMLElement, attr: string, value: unknown) {
    if (attr === 'style') {
      this.applyStyle(el, value);
      return;
    }
    if (attr === 'class' || attr === 'className') {
      this.applyClass(el, value);
      return;
    }
    if (value != el.getAttribute(attr)) {
      el.setAttribute(attr, value as string);
    }
  }

  /** Merge schema class tokens; do not replace NgModel / host classes via setAttribute. */
  private applyClass(el: HTMLElement, value: unknown) {
    const tokens =
      typeof value === 'string'
        ? value.split(/\s+/).filter(Boolean)
        : Array.isArray(value)
          ? value.map(String).filter(Boolean)
          : [];
    const next = new Set(tokens);
    for (const token of this.ownedClassTokens) {
      if (!next.has(token)) {
        el.classList.remove(token);
      }
    }
    for (const token of next) {
      el.classList.add(token);
    }
    this.ownedClassTokens = next;
  }

  private applyStyle(el: HTMLElement, value: unknown) {
    if (typeof value === 'string') {
      this.clearOwnedStyleProps(el);
      el.style.cssText = value;
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const next = value as Record<string, string>;
      const nextKeys = new Set(Object.keys(next));
      for (const prop of this.ownedStyleProps) {
        if (!nextKeys.has(prop)) {
          this.removeStyleProp(el, prop);
        }
      }
      for (const [name, val] of Object.entries(next)) {
        if (name.startsWith('--')) {
          el.style.setProperty(name, val ?? '');
        } else {
          (el.style as any)[name] = val;
        }
      }
      this.ownedStyleProps = nextKeys;
    }
  }

  private clearOwnedStyleProps(el: HTMLElement) {
    for (const prop of this.ownedStyleProps) {
      this.removeStyleProp(el, prop);
    }
    this.ownedStyleProps.clear();
  }

  private removeStyleProp(el: HTMLElement, prop: string) {
    if (prop.startsWith('--')) {
      el.style.removeProperty(prop);
      return;
    }
    el.style.removeProperty(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
    (el.style as any)[prop] = '';
  }

  clearAttrs(oldAttrs: Record<string, any>) {
    const el = this.renderHostElement;
    if (!el?.removeAttribute) {
      return;
    }
    Object.entries(oldAttrs)
      .filter(([attr, value]) => value !== null)
      .forEach(([attr]) => {
        if (this.attrs[attr] !== null && this.attrs[attr] !== undefined) {
          return;
        }
        if (attr === 'class' || attr === 'className') {
          for (const token of this.ownedClassTokens) {
            el.classList.remove(token);
          }
          this.ownedClassTokens.clear();
          return;
        }
        if (attr === 'style') {
          this.clearOwnedStyleProps(el);
          return;
        }
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      });
  }

  private rebindEvents() {
    this.clearEventsFrom(this.boundHost, this.boundEvents);
    this.boundHost = this.renderHostElement;
    this.boundEvents = this.events;
    this.updateEvents();
  }

  private clearEventsFrom(host: HTMLElement | null, events: Record<string, any>) {
    if (!host?.removeEventListener) {
      return;
    }
    Object.entries(events).forEach(([event, value]) => {
      if (typeof value === 'function') {
        host.removeEventListener(toNativeEventName(event), value);
      }
    });
  }

  clearEvents(oldEvents: Record<string, any>) {
    this.clearEventsFrom(this.boundHost || this.renderHostElement, oldEvents);
  }

  updateEvents() {
    const host = this.boundHost || this.renderHostElement;
    if (!host?.addEventListener) {
      return;
    }
    Object.entries(this.events).forEach(([event, value]) => {
      if (typeof value === 'function') {
        host.addEventListener(toNativeEventName(event), value);
      }
    });
  }
}
