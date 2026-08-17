import { Injectable, Injector, Type, afterEveryRender, inject } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { patchOutletContentQueries } from './content-children-patch';

export interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}

/** Plain tree for logging / `| json` (no Angular refs). */
export type OutletSnapshot = TreeNode<string | null>;

/**
 * Native tags are created via `nativeElementComponentFactory` as anonymous
 * `componentType` classes — prefer Angular selector over `Function.name`.
 */
export function getComponentOutletLabel(outlet: ComponentOutlet): string | null {
  const type = outlet.ngComponentOutlet as Type<any> | null;
  if (!type) {
    return null;
  }
  const selector = (type as any).ɵcmp?.selectors?.[0]?.[0];
  if (typeof selector === 'string' && selector) {
    return selector;
  }
  const name = type.name;
  return name && name !== 'componentType' ? name : null;
}

/**
 * Content-query order must follow DOM / schema order, not Map insertion order.
 * Loop items created after a later sibling (e.g. named header) would otherwise
 * append after that sibling in the registry and break @ContentChild /.first.
 */
function compareOutletDomOrder(a: ComponentOutlet, b: ComponentOutlet): number {
  const elA = a.componentRef?.location?.nativeElement as Node | undefined;
  const elB = b.componentRef?.location?.nativeElement as Node | undefined;
  if (!elA || !elB || elA === elB) {
    return 0;
  }
  const position = elA.compareDocumentPosition(elB);
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1;
  }
  if (position & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1;
  }
  return 0;
}

@Injectable()
export class ContentChildrenService {
  protected contentOutletParentMap = new Map<ComponentOutlet, ComponentOutlet | null>();
  private readonly injector = inject(Injector);
  private patchMicrotaskQueued = false;

  constructor() {
    // afterEveryRender runs inside synchronize, *before* checkNoChanges.
    // Mutating QueryList / signals there causes NG0100; markForCheck there causes NG0103.
    // Defer the entire patch until after the current tick (microtask).
    afterEveryRender(
      () => {
        this.schedulePatchAllContentQueries();
      },
      { injector: this.injector },
    );
  }

  public get rootContentOutlet(): ComponentOutlet | null {
    return (
      Array.from(this.contentOutletParentMap.keys()).find(
        (key) => this.contentOutletParentMap.get(key) === null,
      ) ?? null
    );
  }

  setContentOutletParent(contentOutlet: ComponentOutlet, parent: ComponentOutlet | null) {
    this.contentOutletParentMap.set(contentOutlet, parent);
  }

  getContentOutletParent(contentOutlet: ComponentOutlet): ComponentOutlet | null {
    return this.contentOutletParentMap.get(contentOutlet) ?? null;
  }

  getContentOutletChildren(contentOutlet: ComponentOutlet): ComponentOutlet[] {
    return Array.from(this.contentOutletParentMap.keys())
      .filter((key) => this.contentOutletParentMap.get(key) === contentOutlet)
      .sort(compareOutletDomOrder);
  }

  getDescendants(contentOutlet: ComponentOutlet): ComponentOutlet[] {
    return this.getContentOutletChildren(contentOutlet).flatMap((child) => [
      child,
      ...this.getDescendants(child),
    ]);
  }

  removeContentOutlet(contentOutlet: ComponentOutlet) {
    this.contentOutletParentMap.delete(contentOutlet);
  }

  getTree(contentOutlet: ComponentOutlet | null): TreeNode<ComponentOutlet> | null {
    if (!contentOutlet) {
      return null;
    }
    return {
      value: contentOutlet,
      children: this.getContentOutletChildren(contentOutlet).map(
        (child) => this.getTree(child)!,
      ),
    };
  }

  serializeOutlet(contentOutlet: ComponentOutlet | null): OutletSnapshot | null {
    if (!contentOutlet) {
      return null;
    }
    return {
      value: getComponentOutletLabel(contentOutlet),
      children: this.getContentOutletChildren(contentOutlet).map(
        (child) => this.serializeOutlet(child)!,
      ),
    };
  }

  serializeTree(): OutletSnapshot | null {
    return this.serializeOutlet(this.rootContentOutlet);
  }

  serializeTreeJson(space = 2): string {
    return JSON.stringify(this.serializeTree(), null, space);
  }

  private schedulePatchAllContentQueries(): void {
    if (this.patchMicrotaskQueued) {
      return;
    }
    this.patchMicrotaskQueued = true;
    queueMicrotask(() => {
      this.patchMicrotaskQueued = false;
      this.patchAllContentQueries();
    });
  }

  /**
   * Walk outlet tree and patch each parent's ContentChildren / contentChildren() queries
   * with direct child component instances from the schema tree.
   * Call only after the CD tick (see schedulePatchAllContentQueries).
   */
  patchAllContentQueries(): boolean {
    let changed = false;
    for (const parent of this.contentOutletParentMap.keys()) {
      const children = this.getContentOutletChildren(parent);
      if (patchOutletContentQueries(parent, children)) {
        changed = true;
      }
    }
    return changed;
  }
}
