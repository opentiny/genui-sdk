import { Component, inject, signal } from '@angular/core';
import { RendererMain } from '../../projects/renderer/src/renderer-main';
import { RENDERER_SETTINGS } from '../../projects/renderer/src/renderer-settings';
import { ContentChildrenService } from '../../projects/renderer/src/content-children';
import { materials } from './materials';
import { StructuralDemoBannerComponent } from './structural-demo-banner.component';
import { demoScenarios } from './demo-scenarios';
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
  styles: [`
    .scenario-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 16px;
      position: sticky;
      top: 0;
      z-index: 20;
      background: #fff;
      border-bottom: 1px solid #e5e6eb;
    }
    .scenario-bar button {
      border: 1px solid #c9cdd4;
      background: #fff;
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      font: inherit;
      color: #1d2129;
    }
    .scenario-bar button.is-active {
      border-color: #1476ff;
      color: #1476ff;
      background: #e8f3ff;
    }
  `],
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
  readonly scenarios = demoScenarios;
  readonly activeScenarioId = signal(demoScenarios[0].id);
  schema = signal<any>(demoScenarios[0].schema);
  today = new Date(2024, 0, 15);
  private readonly contentChildren = inject(ContentChildrenService, { optional: true });

  selectScenario(id: string) {
    const next = demoScenarios.find((item) => item.id === id);
    if (!next || next.id === this.activeScenarioId()) {
      return;
    }
    this.activeScenarioId.set(next.id);
    this.schema.set(next.schema);
  }

  /** Dev helper — call from template/console if needed. */
  logOutletTree() {
    console.log(this.contentChildren?.serializeTree());
  }
}
