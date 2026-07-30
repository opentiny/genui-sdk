import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RendererMain } from '../../projects/renderer/src/renderer-main';
import { RENDERER_SETTINGS } from '../../projects/renderer/src/renderer-settings';
import { materials } from './materials';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: true,
  imports: [RendererMain, FormsModule],
  providers: [
    {
      provide: RENDERER_SETTINGS,
      useValue: { materials },
    },
  ],
})
export class App {
  schema = signal<any>({});

  async ngOnInit() {
    this.schema.set(await import('../mock/schema.json').then((m) => m.default));
  }
}
