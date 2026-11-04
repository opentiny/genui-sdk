import { Component, Input } from '@angular/core';

/** Demo host for schema `NgComponentOutlet` on `NgTemplate`. */
@Component({
  selector: 'structural-demo-banner',
  standalone: true,
  template: `<span style="display: block; color: #c2410c; font-weight: 600;">{{ label }}</span>`,
})
export class StructuralDemoBannerComponent {
  @Input() label = 'StructuralDemoBanner';
}
