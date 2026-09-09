import { Component } from '@angular/core';

/**
 * 宿主元素占位组件：渲染器只认识组件（ɵcmp），不认识指令（ɵdir）。
 * MatLabel 等 Material 子结构是指令，需要先映射成"宿主元素组件"让渲染器能创建，
 * 再通过指令机制把真实指令挂到宿主上。
 */
@Component({
  selector: '[mat-native-element]',
  standalone: true,
  template: '<ng-content></ng-content>',
})
export class MatNativeElementComponent {}

export function matNativeElementComponentFactory(tagName: string) {
  const componentType = class extends MatNativeElementComponent {};
  (componentType as any).ɵcmp = Object.create((MatNativeElementComponent as any)['ɵcmp']);
  (componentType as any).ɵcmp.selectors = [[tagName]];
  return componentType;
}
