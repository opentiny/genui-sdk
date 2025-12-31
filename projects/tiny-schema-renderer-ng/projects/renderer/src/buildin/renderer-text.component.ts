import { Component, Input } from '@angular/core';
@Component({
  selector: 'span[renderer-text]',
  standalone: true,
  template: '{{ text }}',
  host: {
    style: 'display: contents;',
  },
})
export class RendererTextComponent {
  @Input() text: string = '';
}
