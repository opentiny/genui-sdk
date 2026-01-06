import { Component, HostBinding, Input } from '@angular/core';
@Component({
  selector: 'img[renderer-image]',
  standalone: true,
  template: '',
})
export class RendererImageComponent {
  @HostBinding('src') @Input() src: string = '';
  @HostBinding('alt') @Input() alt: string = '';
}
