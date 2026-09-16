import { Directive, DoCheck, EmbeddedViewRef, Optional, Self } from '@angular/core';
import { AfterComponentCreate, ComponentOutlet } from '../../component-outlet';
import { getNgContentSelectors, syncLiveProjectedNodes } from '../../ng-content/projectable-nodes';
import { BlockContentRefsDirective } from './block-content-refs.directive';
import {
  isRenderBlockType,
  projectedViewFromSlot,
  projectedViewsFromContent,
  SET_PROJECTED_VIEWS,
} from './projected-view';

type BlockHost = {
  [SET_PROJECTED_VIEWS]?: (
    views: ReturnType<typeof projectedViewsFromContent>,
  ) => void;
};

/**
 * After the host is constructed: hand slot views to blocks, then CD detached
 * views so children can follow already-projected anchors.
 */
@Directive({
  selector: '[componentOutlet]',
  standalone: true,
  providers: [{ provide: AfterComponentCreate, useExisting: BlockProjectedViewsDirective }],
})
export class BlockProjectedViewsDirective implements AfterComponentCreate, DoCheck {
  private lastInstance: object | null = null;
  private lastContent: Node[][] | undefined;
  /** Last synced live `rootNodes` per slot — skip `syncLiveProjectedNodes` when unchanged. */
  private lastSyncedLiveRoots: (readonly Node[] | null)[] | null = null;

  constructor(
    private readonly outlet: ComponentOutlet,
    @Optional() @Self() private readonly contentRefs: BlockContentRefsDirective | null,
  ) {}

  onComponentCreated() {
    this.lastInstance = this.outlet.componentInstance;
    this.lastContent = this.outlet.ngComponentOutletContent;
    this.applyProjectedViews();
  }

  ngDoCheck() {
    const instance = this.outlet.componentInstance;
    const content = this.outlet.ngComponentOutletContent;
    if (instance === this.lastInstance && content === this.lastContent) {
      this.refreshDetachedViews(content);
      return;
    }
    this.lastInstance = instance;
    this.lastContent = content;
    this.applyProjectedViews();
  }

  private applyProjectedViews() {
    this.lastSyncedLiveRoots = null;
    const instance = this.outlet.componentInstance as BlockHost | null;
    const content = this.outlet.ngComponentOutletContent;
    const type = this.outlet.ngComponentOutlet;
    if (typeof instance?.[SET_PROJECTED_VIEWS] === 'function') {
      const views = projectedViewsFromContent(content, getNgContentSelectors(type));
      instance[SET_PROJECTED_VIEWS](views);
      const appliedContentRefs = this.contentRefs?.applyContentRefs(instance, content) ?? false;
      if (views || appliedContentRefs) {
        this.outlet.componentRef?.changeDetectorRef.detectChanges();
      }
      return;
    }
    // Anchors must land in ng-content before slot CD. Otherwise nested Text
    // hosts are created beside still-detached comments and never enter TiButton.
    this.outlet.componentRef?.changeDetectorRef.detectChanges();
    this.refreshDetachedViews(content);
    // Detached slot CD is after the first host CD, so ContentChild (DevUI
    // `innerBody` / `rowTempleteForSelect`) is still empty. Refresh the host
    // once children exist so ɵɵqueryRefresh and *ngIf="innerBody" see them.
    this.outlet.componentRef?.changeDetectorRef.detectChanges();
  }

  private refreshDetachedViews(content: Node[][] | undefined) {
    if (!content?.length || isRenderBlockType(this.outlet.ngComponentOutlet)) {
      return;
    }
    // Leaf / empty projection: pipe still passes `[[]]` with no bound view — skip.
    if (!content.some((slot) => projectedViewFromSlot(slot))) {
      return;
    }

    const componentInjector = this.outlet.componentInjector;
    const liveSlots: Node[][] = [];
    for (const slot of content) {
      const viewRef = projectedViewFromSlot(slot) as EmbeddedViewRef<unknown> | null;
      if (viewRef && !viewRef.destroyed) {
        // Detached views cannot see the sibling `#componentOutlet` ref that
        // attached VCR views used for `*ngIf="componentOutlet?.componentInjector"`.
        (viewRef.context as { componentInjector?: unknown }).componentInjector =
          componentInjector;
        viewRef.detectChanges();
        liveSlots.push(viewRef.rootNodes);
      } else {
        liveSlots.push(slot);
      }
    }

    if (sameLiveRoots(this.lastSyncedLiveRoots, liveSlots)) {
      return;
    }
    this.lastSyncedLiveRoots = liveSlots.map((slot) => slot.slice());

    const instance = this.outlet.componentInstance;
    if (instance) {
      syncLiveProjectedNodes(
        instance,
        liveSlots,
        this.outlet.componentRef?.location.nativeElement,
      );
    }
  }
}

function sameLiveRoots(
  prev: (readonly Node[] | null)[] | null,
  next: Node[][],
): boolean {
  if (!prev || prev.length !== next.length) {
    return false;
  }
  for (let i = 0; i < next.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (!a || a.length !== b.length) {
      return false;
    }
    for (let j = 0; j < b.length; j++) {
      if (a[j] !== b[j]) {
        return false;
      }
    }
  }
  return true;
}
