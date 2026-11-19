import { Type, ViewContainerRef } from '@angular/core';

/**
 * 判断 runtime 返回的 root 是否是 Angular 组件。
 *
 * Vue / React 的 root 也可能是 function，但它们没有 Angular 的 ɵcmp 元数据，
 * 不能交给 ViewContainerRef.createComponent。
 */
export function isAngularComponentType(value: unknown): value is Type<unknown> {
  return typeof value === 'function' && !!(value as { ɵcmp?: unknown }).ɵcmp;
}

/**
 * 把 roots 按顺序嵌套到内容外层：
 *
 *   roots = [A, B]，content = C
 *   => A > B > C
 *
 * 先把内容投影到最内层 root，再把内层 root 的 host 投影到外层 root。
 * 倒序创建可以保证每层投影时，下一层已经存在。
 *
 * 约束：root 组件需要有一个默认的 `<ng-content>` 来承接下一层或内容。
 */
export class GenuiRuntimeRootsRenderer {
  private renderedRoots: Type<unknown>[] = [];

  constructor(
    private readonly rootHost: ViewContainerRef,
    private readonly contentSlot: HTMLElement,
    private readonly host: HTMLElement,
  ) {}

  render(roots: Type<unknown>[]): void {
    if (sameRoots(roots, this.renderedRoots)) {
      return;
    }

    this.clear();
    this.renderedRoots = [...roots];

    if (!this.renderedRoots.length) {
      return;
    }

    let projectableNodes: Node[][] = [[this.contentSlot]];

    for (let index = this.renderedRoots.length - 1; index >= 0; index -= 1) {
      const componentRef = this.rootHost.createComponent(this.renderedRoots[index], {
        projectableNodes,
      });
      componentRef.changeDetectorRef.detectChanges();
      projectableNodes = [[componentRef.location.nativeElement]];
    }
  }

  destroy(): void {
    this.clear();
  }

  private clear(): void {
    // 先把内容槽移回 ConfigProvider 宿主，再销毁动态组件，避免内容随 root host 一起被移除。
    this.host.appendChild(this.contentSlot);
    this.rootHost.clear();
    this.renderedRoots = [];
  }
}

function sameRoots(a: readonly Type<unknown>[], b: readonly Type<unknown>[]): boolean {
  return a.length === b.length && a.every((root, index) => root === b[index]);
}
