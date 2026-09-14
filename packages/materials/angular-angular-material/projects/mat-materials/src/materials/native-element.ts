import { Component, Type } from '@angular/core';

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

/**
 * Prefer the native HTML host selector (e.g. `table[mat-table]`, `tr[mat-header-row]`)
 * so `createComponent` builds `<table>` / `<tr>` instead of `<mat-table>` / `<mat-header-row>`.
 *
 * Flex-element table CSS (`mat-header-cell { flex:1 }`) does not apply to `th`/`td`.
 * MatTextColumn and our schemas use `th`/`td`, which only layout correctly inside a real
 * `<table>` + `<tr>` (table-cell display).
 */
export function preferNativeHtmlTableHost<T>(component: Type<T>): Type<T> {
  const def = (component as Type<T> & { ɵcmp?: { selectors?: unknown[][] } }).ɵcmp;
  const selectors = def?.selectors;
  if (!Array.isArray(selectors) || selectors.length < 2) {
    return component;
  }
  // Native form is `['table', 'mat-table', '']` / `['tr', 'mat-header-row', '']`
  // (length > 1). Custom-element form is `['mat-table']`.
  const nativeIdx = selectors.findIndex(
    (sel) => Array.isArray(sel) && sel.length > 1 && typeof sel[0] === 'string',
  );
  if (nativeIdx <= 0) {
    return component;
  }
  const next = selectors.slice();
  const [native] = next.splice(nativeIdx, 1);
  next.unshift(native);
  def!.selectors = next;
  return component;
}
