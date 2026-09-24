import { Component, Input, inject } from '@angular/core';
import { ControlContainer } from '@angular/forms';

/**
 * Demo material: `{ skipSelf: true }` (no host) reads the parent schema injector.
 * Inside `<form>` this is NgForm; inside `ngModelGroup` it is SchemaNgModelGroup.
 */
@Component({
  selector: 'form-dump',
  standalone: true,
  template: `
    <div class="form-dump">
      <div class="form-dump__title">{{ title }}</div>
      <pre>{{ snapshot }}</pre>
    </div>
  `,
  styles: [
    `
      .form-dump {
        margin-top: 8px;
        padding: 8px 10px;
        background: #0f172a;
        color: #e2e8f0;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.45;
      }
      .form-dump__title {
        color: #93c5fd;
        font-weight: 600;
        margin-bottom: 4px;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-all;
      }
    `,
  ],
})
export class FormDumpComponent {
  @Input() title = 'ControlContainer (skipSelf, no host)';

  private readonly container = inject(ControlContainer, { skipSelf: true, optional: true });

  get snapshot(): string {
    const c = this.container as ControlContainer & { controls?: Record<string, unknown> };
    if (!c) {
      return 'null';
    }
    const nested = (c as { control?: { controls?: Record<string, unknown> } }).control?.controls;
    const controls = Object.keys(c.controls ?? nested ?? {});
    return JSON.stringify(
      {
        type: c.constructor?.name,
        controls,
        value: c.value,
      },
      null,
      2,
    );
  }
}
