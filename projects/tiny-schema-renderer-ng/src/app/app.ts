import { Component, inject, signal } from '@angular/core';
import { RendererMain } from '../../projects/renderer/src/renderer-main';
import { RENDERER_SETTINGS } from '../../projects/renderer/src/renderer-settings';
import { ContentChildrenService } from '../../projects/renderer/src/content-children';
import { materials } from './materials';
import { StructuralDemoBannerComponent } from './structural-demo-banner.component';
import testBlockSchema from '../mock/block.json';
import listBlockSchema from '../mock/list-block.json';
import listItemBlockSchema from '../mock/list-item-block.json';

// Schema expressions cannot keep class Types through JSON clone / parseData.bind.
// Expose the NgComponentOutlet demo host for `globalThis.__structuralDemoBanner`.
(globalThis as unknown as { __structuralDemoBanner: unknown }).__structuralDemoBanner =
  StructuralDemoBannerComponent;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: true,
  imports: [RendererMain],
  providers: [
    {
      provide: RENDERER_SETTINGS,
      useValue: {
        materials: {
          ...materials,
          blocks: {
            TestBlock: testBlockSchema,
            ContentRefList: listBlockSchema,
            ContentRefListItem: listItemBlockSchema,
          },
        },
      },
    },
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
