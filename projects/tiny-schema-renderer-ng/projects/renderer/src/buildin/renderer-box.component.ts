import { Component } from '@angular/core';
@Component({
  selector: 'div[renderer-box]',
  standalone: true,
  template: '<ng-content></ng-content>',
})
export class RendererBoxComponent {}
