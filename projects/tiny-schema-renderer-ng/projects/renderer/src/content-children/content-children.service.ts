import { Injectable, Type } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';

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

@Injectable()
export class ContentChildrenService {
  protected contentOutletParentMap = new Map<ComponentOutlet, ComponentOutlet | null>();

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
    return Array.from(this.contentOutletParentMap.keys()).filter(
      (key) => this.contentOutletParentMap.get(key) === contentOutlet,
    );
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
}
