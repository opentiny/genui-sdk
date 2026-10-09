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
    if (host && host !== this.boundHost) {
      this.updateAttrs();
      this.rebindEvents();
    }
  }

  ngOnDestroy() {
    this.clearEventsFrom(this.boundHost, this.boundEvents);
    this.boundHost = null;
    this.boundEvents = {};
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
          ? value.map(String)
          : [];
    for (const token of tokens) {
      el.classList.add(token);
    }
  }

  private applyStyle(el: HTMLElement, value: unknown) {
    if (typeof value === 'string') {
      el.style.cssText = value;
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(el.style, value as Record<string, string>);
    }
  }
  clearAttrs(oldAttrs: Record<string, any>) {
    if (!this.renderHostElement?.removeAttribute) {
      return;
    }
    Object.entries(oldAttrs)
      .filter(([attr, value]) => value !== null)
      .forEach(([attr, value]) => {
        if (this.renderHostElement?.hasAttribute(attr) && (this.attrs[attr] === null || this.attrs[attr] === undefined)) {
          this.renderHostElement.removeAttribute(attr);
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
