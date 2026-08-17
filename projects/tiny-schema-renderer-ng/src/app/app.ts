import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RendererMain } from '../../projects/renderer/src/renderer-main';
import { RENDERER_SETTINGS } from '../../projects/renderer/src/renderer-settings';
import {
  provideContentChildren,
  ContentChildrenService,
} from '../../projects/renderer/src/content-children';
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
    // Optional: enable content-children outlet tree. Remove to disable.
    ...provideContentChildren(),
  ],
})
export class App {
  schema = signal<any>({});
  private readonly contentChildren = inject(ContentChildrenService, { optional: true });

  async ngOnInit() {
    this.schema.set(await import('../mock/schema.json').then((m) => m));
  }

  /** Dev helper — call from template/console if needed. */
  logOutletTree() {
    console.log(this.contentChildren?.serializeTree());
  }
}
