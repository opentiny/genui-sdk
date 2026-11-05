import { booleanAttribute, Component, ElementRef, inject, Input } from '@angular/core';
import type { Type } from '@angular/core';
import { RENDERER_SETTINGS, type NotifyHandler } from '@opentiny/tiny-schema-renderer-ng';
import { GenuiRenderer, type ICustomAction } from '@opentiny/genui-sdk-angular';
import { jsonAttribute } from './attribute-transform';

/**
 * 自定义元素的根组件：唯一被 `createCustomElement` 包装的组件。
 *
 * 存在的意义是把 attribute 上的字符串收敛成渲染器需要的类型：
 * Angular 的 `createCustomElement` 会把 attribute 直接赋给同名 `@Input`，
 * 不做转换的话 `generating="false"` 会变成字符串 `"false"`（真值），`state` 也拿不到对象。
 */
@Component({
  selector: 'genui-config-renderer-root',
  standalone: true,
  imports: [GenuiRenderer],
  template: `
    <genui-renderer
      [id]="id"
      [content]="content"
      [generating]="generating"
      [isJsonComplete]="isJsonComplete"
      [state]="state"
      [customComponents]="customComponents"
      [customActions]="customActions"
      [requiredCompleteFieldSelectors]="requiredCompleteFieldSelectors"
    ></genui-renderer>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class GenuiConfigRendererRoot {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** 由 createGenuiConfigRendererElement 在应用级注入，GenuiRenderer 会复用同一个对象 */
  private readonly settings = inject(RENDERER_SETTINGS, { optional: true });

  /** 没有外部传入 notify 时，把通知转成 DOM 事件，方便纯 HTML 宿主监听 */
  private readonly dispatchNotify: NotifyHandler = (payload) => {
    this.host.nativeElement.dispatchEvent(
      new CustomEvent('genui-notify', { detail: payload, bubbles: true, composed: true }),
    );
  };

  @Input() id?: string;
  // content 保留原始字符串：流式输出时是半截 JSON，交给渲染器里的 repairJson 处理
  @Input() content: string | object = '{}';
  @Input({ transform: booleanAttribute }) generating = false;
  @Input({ transform: booleanAttribute }) isJsonComplete = false;
  @Input({ transform: jsonAttribute }) state?: Record<string, any>;
  @Input({ transform: jsonAttribute }) requiredCompleteFieldSelectors?: string[];
  @Input() customComponents: Record<string, Type<any>> = {};
  @Input() customActions: Record<string, ICustomAction> = {};

  @Input()
  set notify(value: NotifyHandler | undefined) {
    if (this.settings) {
      this.settings.notify = value ?? this.dispatchNotify;
    }
  }

  constructor() {
    if (this.settings) {
      this.settings.notify = this.dispatchNotify;
    }
  }
}
