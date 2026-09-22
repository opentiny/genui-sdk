import { Component, inject, signal } from '@angular/core';
import { RendererMain } from '../../projects/renderer/src/renderer-main';
import { RENDERER_SETTINGS } from '../../projects/renderer/src/renderer-settings';
import { ContentChildrenService } from '../../projects/renderer/src/content-children';
import { materials } from './materials';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: true,
  imports: [RendererMain],
  providers: [
    {
      provide: RENDERER_SETTINGS,
      useValue: { materials },
    }
  ],
})
export class App {
  schema = signal<any>({});
  today = new Date(2024, 0, 15);
  private readonly contentChildren = inject(ContentChildrenService, { optional: true });

  async ngOnInit() {
    this.schema.set((await import('../mock/schema.json')).default);
  }

  /** Dev helper — call from template/console if needed. */
  logOutletTree() {
    console.log(this.contentChildren?.serializeTree());
  }
}
