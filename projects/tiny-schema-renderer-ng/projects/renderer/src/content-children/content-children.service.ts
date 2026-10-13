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
    // Seed the root so a self/ancestor cycle (A→A or A→B→A) can't return the root itself.
    return this.collectDescendants(contentOutlet, new Set([contentOutlet]));
  }

  private collectDescendants(
    contentOutlet: ComponentOutlet,
    visited: Set<ComponentOutlet>,
  ): ComponentOutlet[] {
    const result: ComponentOutlet[] = [];
    for (const child of this.getContentOutletChildren(contentOutlet)) {
      if (visited.has(child)) {
        continue;
      }
      visited.add(child);
      result.push(child, ...this.collectDescendants(child, visited));
    }
    return result;
  }

  removeContentOutlet(contentOutlet: ComponentOutlet) {
    this.contentOutletParentMap.delete(contentOutlet);
  }

  getTree(contentOutlet: ComponentOutlet | null): TreeNode<ComponentOutlet> | null {
    if (!contentOutlet) {
      return null;
    }
    return this.buildTree(contentOutlet, new Set());
  }

  private buildTree(
    contentOutlet: ComponentOutlet,
    visited: Set<ComponentOutlet>,
  ): TreeNode<ComponentOutlet> {
    visited.add(contentOutlet);
    return {
      value: contentOutlet,
      children: this.getContentOutletChildren(contentOutlet)
        .filter((child) => !visited.has(child))
        .map((child) => this.buildTree(child, visited)),
    };
  }

  serializeOutlet(contentOutlet: ComponentOutlet | null): OutletSnapshot | null {
    if (!contentOutlet) {
      return null;
    }
    return this.buildSnapshot(contentOutlet, new Set());
  }

  private buildSnapshot(
    contentOutlet: ComponentOutlet,
    visited: Set<ComponentOutlet>,
  ): OutletSnapshot {
    visited.add(contentOutlet);
    return {
      value: getComponentOutletLabel(contentOutlet),
      children: this.getContentOutletChildren(contentOutlet)
        .filter((child) => !visited.has(child))
        .map((child) => this.buildSnapshot(child, visited)),
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
    // Build the child-list index once per patch pass, then traverse it, instead of
    // rescanning `contentOutletParentMap` per descendant per outlet (superlinear before).
    const childrenByParent = new Map<ComponentOutlet | null, ComponentOutlet[]>();
    for (const [outlet, parent] of this.contentOutletParentMap) {
      const list = childrenByParent.get(parent);
      if (list) {
        list.push(outlet);
      } else {
        childrenByParent.set(parent, [outlet]);
      }
    }
    for (const list of childrenByParent.values()) {
      list.sort(compareOutletSchemaOrder);
    }

    const descendantsOf = (outlet: ComponentOutlet): ComponentOutlet[] => {
      const result: ComponentOutlet[] = [];
      const seen = new Set<ComponentOutlet>([outlet]);
      const visit = (o: ComponentOutlet): void => {
        for (const child of childrenByParent.get(o) ?? []) {
          if (seen.has(child)) {
            continue;
          }
          seen.add(child);
          result.push(child);
          visit(child);
        }
      };
      visit(outlet);
      return result;
    };

    let changed = false;
    for (const parent of this.contentOutletParentMap.keys()) {
      // descendants: true queries need refs from nested outlets too.
      if (patchOutletContentQueries(parent, descendantsOf(parent))) {
        changed = true;
      }
    }
    return changed;
  }
}
