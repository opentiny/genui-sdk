import { Directive, DoCheck } from '@angular/core';
import { ComponentOutlet } from '../../component-outlet';
import { getNgContentSelectors } from '../../ng-content/projectable-nodes';
import { projectedViewsFromContent, SET_PROJECTED_VIEWS } from './projected-view';

type BlockHost = {
  [SET_PROJECTED_VIEWS]?: (
    views: ReturnType<typeof projectedViewsFromContent>,
  ) => void;
};

/**
 * Block-only companion on `[componentOutlet]`. Native hosts have no
 * `[SET_PROJECTED_VIEWS]` and this is a no-op.
 */
@Directive({
  selector: '[componentOutlet]',
  standalone: true,
})
export class BlockProjectedViewsDirective implements DoCheck {
  private lastInstance: object | null = null;
  private lastContent: Node[][] | undefined;

  constructor(private readonly outlet: ComponentOutlet) {}

  ngDoCheck() {
    const instance = this.outlet.componentInstance as BlockHost | null;
    const content = this.outlet.ngComponentOutletContent;
    if (instance === this.lastInstance && content === this.lastContent) {
      return;
    }
    this.lastInstance = instance;
    this.lastContent = content;
    if (typeof instance?.[SET_PROJECTED_VIEWS] !== 'function') {
      return;
    }
    const views = projectedViewsFromContent(
      content,
      getNgContentSelectors(this.outlet.ngComponentOutlet),
    );
    instance[SET_PROJECTED_VIEWS](views);
    if (views) {
      this.outlet.componentRef?.changeDetectorRef.detectChanges();
    }
  }
}
