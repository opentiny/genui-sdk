import {
  Directive,
  Input,
  ElementRef,
  SimpleChanges,
  ComponentRef,
  Optional,
  ChangeDetectorRef,
  Self,
} from '@angular/core';
import { toNativeEventName } from './parser/event-utils';
import { ComponentOutlet } from './component-outlet';

@Directive({
  selector: '[attrAndEvent]',
  standalone: true,
})
export class AttrAndEventDirective {
  @Input() attrs: Record<string, any> = {};
  @Input() events: Record<string, any> = {};
  get renderHostElemet() {
    return (
      this.componentRef?.location.nativeElement ||
      this.componentOutlet['_componentRef']?.location.nativeElement ||
      (this.elementRef.nativeElement.parentElement?.firstElementChild as HTMLElement)
    );
  }
  constructor(
    private elementRef: ElementRef,
    @Self() @Optional() private componentRef: ComponentRef<any>,
    private cd: ChangeDetectorRef,
    private componentOutlet: ComponentOutlet,
  ) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['attrs']) {
      this.clearAttrs(changes['attrs'].previousValue || {});
      this.updateAttrs();
    }
    if (changes['events']) {
      this.clearEvents(changes['events'].previousValue || {});
      this.updateEvents();
    }
  }

  updateAttrs() {
    if (!this.renderHostElemet?.setAttribute) {
      // 可能为comment类型
      return;
    }
    Object.entries(this.attrs)
      .filter(([attr, value]) => value !== null)
      .forEach(([attr, value]) => {
        if (value != this.renderHostElemet.getAttribute(attr)) { // 不需要严格不等于
          this.renderHostElemet.setAttribute(attr, value);
        }
      });
  }
  clearAttrs(oldAttrs: Record<string, any>) {
    if (!this.renderHostElemet?.removeAttribute) {
      return;
    }
    Object.entries(oldAttrs)
      .filter(([attr, value]) => value !== null)
      .forEach(([attr, value]) => {
        if (this.renderHostElemet?.hasAttribute(attr) && (this.attrs[attr] === null || this.attrs[attr] === undefined)) {
          this.renderHostElemet.removeAttribute(attr);
        }
      });
  }
  clearEvents(oldEvents: Record<string, any>) {
    if (!this.renderHostElemet?.removeEventListener) {
      return;
    }
    Object.entries(oldEvents).forEach(([event, value]) => {
      this.renderHostElemet.removeEventListener(toNativeEventName(event), value);
    });
  }
  updateEvents() {
    if (!this.renderHostElemet?.addEventListener) {
      return;
    }
    Object.entries(this.events).forEach(([event, value]) => {
      this.renderHostElemet.addEventListener(toNativeEventName(event), value);
    });
  }
}
