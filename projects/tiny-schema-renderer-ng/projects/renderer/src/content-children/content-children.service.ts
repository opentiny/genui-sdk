import { Injectable, Injector, Type, afterEveryRender } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import {
  getContentOutletSchemaIndex,
  patchOutletContentQueries,
} from './content-children-patch';

export interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}

/** Plain tree for logging / `| json` (no Angular refs). */
export type OutletSnapshot = TreeNode<string | null>;

/** Native tags use anonymous `componentType` classes — prefer the Angular selector over `Function.name`. */
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

/** Content-query order must follow schema declaration order, not projection/DOM order. */
function compareOutletSchemaOrder(a: ComponentOutlet, b: ComponentOutlet): number {
  return (
    (getContentOutletSchemaIndex(a) ?? Number.MAX_SAFE_INTEGER) -
    (getContentOutletSchemaIndex(b) ?? Number.MAX_SAFE_INTEGER)
  );
}

@Injectable()
export class ContentChildrenService {
  protected contentOutletParentMap = new Map<ComponentOutlet, ComponentOutlet | null>();
  private patchMicrotaskQueued = false;

  constructor(private readonly injector: Injector) {
    // Mutating QueryList/signals or markForCheck inside afterEveryRender throws NG0100/NG0103 —
    // defer the whole patch to a post-tick microtask.
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
      .sort(compareOutletSchemaOrder);
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

  /** Walk the outlet tree and patch each parent's content queries with its schema children. */
  patchAllContentQueries(): boolean {
    let changed = false;
    for (const parent of this.contentOutletParentMap.keys()) {
      if (patchOutletContentQueries(parent)) {
        changed = true;
      }
    }
    return changed;
  }
}
