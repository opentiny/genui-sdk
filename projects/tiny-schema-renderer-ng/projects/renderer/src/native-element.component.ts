import { Component } from "@angular/core";

@Component({
  selector: '[native-element-component]',
  standalone: true,
  template: '<ng-content></ng-content>',
})
export class NativeElementComponent {}

export function nativeElementComponentFactory(tagName: string) {
  const componentType = class extends NativeElementComponent {};
  (componentType as any).ɵcmp = Object.create((NativeElementComponent as any)['ɵcmp']);
  (componentType as any).ɵcmp.selectors = [[tagName]];
  return componentType;
}