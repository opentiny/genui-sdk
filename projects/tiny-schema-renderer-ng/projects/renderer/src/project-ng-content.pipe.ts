import {
  EmbeddedViewRef,
  Injector,
  OnDestroy,
  Pipe,
  PipeTransform,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import {
  classifySchemaChildrenByNgContentSelectors,
  getNgContentSelectors,
} from './projectable-nodes';

function sameBucketChildren(prev: unknown, next: unknown): boolean {
  if (prev === next) {
    return true;
  }
  if (typeof prev === 'string' || typeof next === 'string') {
    return prev === next;
  }
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Builds `projectableNodes` for `createComponent`, one live `rootNodes` array per ng-content slot.
 *
 * Never return a fresh `[[]]` / new outer array from transform — ComponentOutlet remounts when
 * `content` identity changes, which fights content-children patch and can infinite-loop CD.
 *
 * Do not call `detectChanges()` here (runs during parent CD). Embedded views are attached to the
 * VCR and refresh on the normal CD pass after context is assigned — same as the create path
 * comment in {@link EmbeddedViewPipe} ("不可 detectChanges").
 */
@Pipe({
  name: 'projectNgContent',
  standalone: true,
})
export class ProjectNgContentPipe implements PipeTransform, OnDestroy {
  private viewRefs: Array<EmbeddedViewRef<any> | null> = [];
  private slots: Node[][] = [];
  private selectors: string[] = ['*'];
  private bucketCache: any[] = [];
  private readonly emptyNodes: Node[][] = [[]];
  private multiEmptyNodes: Node[][] | null = null;
  private multiEmptySlotCount = 0;
  private singleSlotNodes: Node[][] = this.emptyNodes;

  transform(
    context: Record<string, any>,
    childrenTemplate: TemplateRef<any>,
    viewContainerRef: ViewContainerRef,
    parentComponentType?: Type<any> | null,
    options?: { index: number; injector?: Injector },
  ): Node[][] {
    const selectors = getNgContentSelectors(parentComponentType);
    const children = (context as any)?.children;

    if (selectors.length === 1 && selectors[0] === '*') {
      return this.transformSingleSlot(context, children, childrenTemplate, viewContainerRef, options);
    }

    if (!(children as any)?.length && typeof children !== 'string') {
      if (this.viewRefs.length) {
        this.destroyViews();
      }
      return this.emptyNodesFor(selectors.length);
    }

    const buckets = this.buildStableBuckets(children, selectors);

    if (
      this.viewRefs.length &&
      (this.selectors.length !== selectors.length ||
        this.selectors.some((s, i) => s !== selectors[i]))
    ) {
      this.destroyViews();
    }

    this.selectors = selectors;

    if (!this.viewRefs.length) {
      this.slots = [];
      for (let i = 0; i < selectors.length; i++) {
        const slotContext = { ...context, children: buckets[i] };
        const viewRef = viewContainerRef.createEmbeddedView(
          childrenTemplate,
          slotContext,
          options,
        );
        this.viewRefs[i] = viewRef;
        this.slots[i] = viewRef.rootNodes;
      }
      return this.slots;
    }

    for (let i = 0; i < selectors.length; i++) {
      const viewRef = this.viewRefs[i];
      if (!viewRef) {
        continue;
      }
      const prevChildren = viewRef.context?.children;
      const prevScope = viewRef.context?.scope;
      const nextChildren = buckets[i];
      const nextScope = context['scope'];
      if (sameBucketChildren(prevChildren, nextChildren) && prevScope === nextScope) {
        continue;
      }
      Object.assign(viewRef.context, { ...context, children: nextChildren });
      // No detectChanges — let the attached view refresh on the normal CD pass.
    }
    return this.slots;
  }

  private transformSingleSlot(
    context: Record<string, any>,
    children: unknown,
    childrenTemplate: TemplateRef<any>,
    viewContainerRef: ViewContainerRef,
    options?: { index: number; injector?: Injector },
  ): Node[][] {
    if (!(children as any)?.length) {
      if (this.viewRefs[0]) {
        this.destroyViews();
        this.singleSlotNodes = this.emptyNodes;
      }
      return this.emptyNodes;
    }
    const viewRef = this.viewRefs[0];
    if (viewRef) {
      Object.assign(viewRef.context, context);
      return this.singleSlotNodes;
    }
    const created = viewContainerRef.createEmbeddedView(childrenTemplate, context, options);
    this.viewRefs = [created];
    this.selectors = ['*'];
    this.singleSlotNodes = [created.rootNodes];
    return this.singleSlotNodes;
  }

  private emptyNodesFor(slotCount: number): Node[][] {
    if (slotCount <= 1) {
      return this.emptyNodes;
    }
    if (this.multiEmptyNodes && this.multiEmptySlotCount === slotCount) {
      return this.multiEmptyNodes;
    }
    this.multiEmptySlotCount = slotCount;
    this.multiEmptyNodes = Array.from({ length: slotCount }, () => []);
    return this.multiEmptyNodes;
  }

  private buildStableBuckets(children: unknown, selectors: string[]): any[] {
    let next: any[];
    if (typeof children === 'string') {
      const starIndex = selectors.findIndex((s) => s === '*');
      const defaultIdx = starIndex >= 0 ? starIndex : Math.max(0, selectors.length - 1);
      next = selectors.map((_, i) => (i === defaultIdx ? children : []));
    } else if (Array.isArray(children) && children.length) {
      next = classifySchemaChildrenByNgContentSelectors(children, selectors);
    } else {
      next = selectors.map(() => []);
    }

    const stabilized: any[] = [];
    for (let i = 0; i < next.length; i++) {
      const prev = this.bucketCache[i];
      if (sameBucketChildren(prev, next[i])) {
        stabilized[i] = prev;
      } else {
        stabilized[i] = next[i];
        this.bucketCache[i] = next[i];
      }
    }
    this.bucketCache.length = stabilized.length;
    return stabilized;
  }

  ngOnDestroy() {
    this.destroyViews();
  }

  private destroyViews() {
    for (const viewRef of this.viewRefs) {
      viewRef?.destroy();
    }
    this.viewRefs = [];
    this.slots = [];
    this.bucketCache = [];
    this.singleSlotNodes = this.emptyNodes;
  }
}
