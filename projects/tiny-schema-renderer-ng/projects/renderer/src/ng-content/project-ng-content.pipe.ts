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
import { bindProjectedView, unbindProjectedView } from '../block';
import { RendererContextService } from '../context.service';

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
 * Views are always detached (never on the parent VCR). Angular copies `rootNodes` at
 * `createComponent` time; unused slots stay off the parent and do not leak beside the host.
 * Children instantiate after the host exists (`componentInjector` / after-create CD).
 *
 * Never return a fresh outer array from transform — ComponentOutlet remounts when
 * `content` identity changes.
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
  private indexCache: number[][] = [];
  private readonly emptyNodes: Node[][] = [[]];
  private multiEmptyNodes: Node[][] | null = null;
  private multiEmptySlotCount = 0;
  private singleSlotNodes: Node[][] = this.emptyNodes;

  constructor(private readonly contextService: RendererContextService) {}

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
      return this.transformSingleSlot(context, children, childrenTemplate, options);
    }

    if (!(children as any)?.length && typeof children !== 'string') {
      if (this.viewRefs.length) {
        this.destroyViews();
      }
      return this.emptyNodesFor(selectors.length);
    }

    if (
      this.viewRefs.length &&
      (this.selectors.length !== selectors.length ||
        this.selectors.some((s, i) => s !== selectors[i]))
    ) {
      this.destroyViews();
    }

    const buckets = this.buildStableBuckets(children, selectors);
    this.selectors = selectors;

    if (!this.viewRefs.length) {
      this.slots = [];
      for (let i = 0; i < selectors.length; i++) {
        const slotContext = {
          ...context,
          children: buckets[i],
          slotIndexes: this.indexCache[i],
        };
        const viewRef = this.createSlotView(
          childrenTemplate,
          slotContext,
          options,
        );
        this.viewRefs[i] = viewRef;
        this.slots[i] = viewRef.rootNodes;
        bindProjectedView(this.slots[i], viewRef);
      }
      return this.slots;
    }

    for (let i = 0; i < selectors.length; i++) {
      const viewRef = this.viewRefs[i];
      if (!viewRef) {
        continue;
      }
      const nextChildren = buckets[i];
      const nextScope = context['scope'];
      const nextSlotIndexes = this.indexCache[i];
      if (
        sameBucketChildren(viewRef.context?.children, nextChildren) &&
        sameBucketChildren(viewRef.context?.slotIndexes, nextSlotIndexes) &&
        viewRef.context?.scope === nextScope
      ) {
        continue;
      }
      Object.assign(viewRef.context, {
        ...context,
        children: nextChildren,
        slotIndexes: nextSlotIndexes,
      });
    }
    return this.slots;
  }

  private transformSingleSlot(
    context: Record<string, any>,
    children: unknown,
    childrenTemplate: TemplateRef<any>,
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
    const created = this.createSlotView(childrenTemplate, context, options);
    this.viewRefs = [created];
    this.selectors = ['*'];
    this.singleSlotNodes = [created.rootNodes];
    bindProjectedView(this.singleSlotNodes[0], created);
    return this.singleSlotNodes;
  }

  /**
   * Always detached. String children must `detectChanges` so `{{ children }}` exists
   * in `rootNodes` before `createComponent` copies them — Tiny hosts (TiButton)
   * only project those nodes, not later interpolation.
   */
  private createSlotView(
    childrenTemplate: TemplateRef<any>,
    context: Record<string, any>,
    options?: { index: number; injector?: Injector },
  ): EmbeddedViewRef<any> {
    const viewRef = childrenTemplate.createEmbeddedView(context, options?.injector);
    if (typeof context['children'] === 'string') {
      viewRef.detectChanges();
    }
    return viewRef;
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
    let nextIndexes: number[][] = [];
    if (typeof children === 'string') {
      const starIndex = selectors.findIndex((s) => s === '*');
      const defaultIdx = starIndex >= 0 ? starIndex : Math.max(0, selectors.length - 1);
      next = selectors.map((_, i) => (i === defaultIdx ? children : []));
      nextIndexes = selectors.map(() => []);
    } else if (Array.isArray(children) && children.length) {
      const classified = classifySchemaChildrenByNgContentSelectors(
        children,
        selectors,
        this.contextService.getContext(),
      );
      next = classified.buckets;
      nextIndexes = classified.originalIndexes;
    } else {
      next = selectors.map(() => []);
      nextIndexes = selectors.map(() => []);
    }

    const stabilized: any[] = [];
    for (let i = 0; i < next.length; i++) {
      if (sameBucketChildren(this.bucketCache[i], next[i])) {
        stabilized[i] = this.bucketCache[i];
      } else {
        stabilized[i] = next[i];
        this.bucketCache[i] = next[i];
      }
      this.indexCache[i] = nextIndexes[i];
    }
    this.bucketCache.length = stabilized.length;
    this.indexCache.length = next.length;
    return stabilized;
  }

  ngOnDestroy() {
    this.destroyViews();
  }

  private destroyViews() {
    for (let i = 0; i < this.viewRefs.length; i++) {
      unbindProjectedView(this.slots[i]);
      const viewRef = this.viewRefs[i];
      if (!viewRef) {
        continue;
      }
      unbindProjectedView(viewRef.rootNodes);
      viewRef.destroy();
    }
    unbindProjectedView(this.singleSlotNodes[0]);
    this.viewRefs = [];
    this.slots = [];
    this.bucketCache = [];
    this.indexCache = [];
    this.singleSlotNodes = this.emptyNodes;
  }
}
