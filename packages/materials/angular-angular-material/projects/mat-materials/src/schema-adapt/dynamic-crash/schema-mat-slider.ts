import { afterEveryRender, Component } from '@angular/core';
import { MatSlider } from '@angular/material/slider';

/**
 * 原因：动态渲染会抛错。
 * 官方假设：ngAfterViewInit 时 ContentChild 拇指 input 已在。
 * schema 时序：先建 MatSlider，再投影 matSliderThumb；首帧 `_getInput(END)` 为空，
 * `_validateInputs` 抛 `Invalid slider thumb input configuration`。
 *
 * 空则推迟 super.ngAfterViewInit；拇指到齐后再跑原初始化。不改 MatSlider.prototype。
 * @Component 仅满足 NG2007；真正的 template/selector 由 adoptStandaloneType 换成官方 ɵcmp。
 * 不要自定义 constructor：ɵfac 仍按 MatSlider 的依赖 `new SchemaMatSlider(...)`。
 */
@Component({
  selector: 'schema-mat-slider',
  standalone: true,
  template: '',
})
export class SchemaMatSlider extends MatSlider {
  private sliderInitPending = false;

  private readonly thumbRetry = afterEveryRender(() => {
    if (!this.sliderInitPending) {
      return;
    }
    if (!this.hasEndThumb()) {
      return;
    }
    this.sliderInitPending = false;
    super.ngAfterViewInit();
  });

  override ngAfterViewInit(): void {
    if (!this.hasEndThumb()) {
      this.sliderInitPending = true;
      return;
    }
    super.ngAfterViewInit();
  }

  private hasEndThumb(): boolean {
    return !!(typeof (this as any)._getInput === 'function' && (this as any)._getInput(2));
  }
}
