import { Directive, forwardRef, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { NgPlural, NgPluralCase } from '@angular/common';
import { SchemaDeferredNgPlural } from './schema-deferred-ng-plural';

/**
 * Schema replacement for `NgPluralCase`.
 *
 * 解决两个问题：
 *
 * 1. **Host DI** — 原 `NgPluralCase.ɵfac` 注入 `NgPlural` 用 `{ host: true }`，
 *    动态 ng-template 宿主不在父 TNode 子树上，改为 `{ skipSelf: true }`。
 *
 * 2. **@Attribute 缺失** — 动态构造时 `@Attribute('ngPluralCase')` 只能拿到 `''`，
 *    导致注册 key 为 `=`（`Number('')=0` → `isANumber=true` → `'='`）。
 *    多个 case 会互相覆盖同一个 `'='` slot。构造后立刻记下**本实例**的 SwitchView
 *    并从坏 key 卸下；`@Input('ngPluralCase')` 再用正确 key 注册自己的 view，
 *    绝不从共享的 `caseViews['=']` 挪别人的 view。
 */
@Directive({
  selector: '[ngPluralCase]',
  standalone: true,
  inputs: ['ngPluralCase'],
  providers: [{ provide: NgPluralCase, useExisting: forwardRef(() => SchemaNgPluralCase) }],
})
export class SchemaNgPluralCase extends NgPluralCase {
  private readonly parent = inject(NgPlural, { skipSelf: true });
  /** SwitchView created for this case in `super()` — not shared with siblings. */
  private readonly ownView: unknown;
  private registeredKey: string | null = null;

  constructor() {
    const template = inject(TemplateRef);
    const viewContainer = inject(ViewContainerRef);
    const parent = inject(NgPlural, { skipSelf: true });
    // @Attribute 拿不到值，给空串防止构造抛错；随后立刻卸下坏 key。
    super('', template, viewContainer, parent);

    const caseViews = (parent as unknown as { _caseViews?: Record<string, unknown> })._caseViews;
    this.ownView = caseViews?.['='] ?? caseViews?.[''] ?? caseViews?.['null'];
    // Unregister provisional key so later sibling constructors cannot overwrite our view.
    if (caseViews && this.ownView !== undefined) {
      for (const bad of ['=', '', 'null'] as const) {
        if (caseViews[bad] === this.ownView) {
          delete caseViews[bad];
        }
      }
    }
  }

  @Input('ngPluralCase')
  set attrFixNgPluralCase(value: string | number | null | undefined) {
    if (value === null || value === undefined || this.ownView === undefined) {
      return;
    }
    const key = !isNaN(Number(value)) ? `=${value}` : String(value);
    const caseViews = (this.parent as unknown as { _caseViews?: Record<string, unknown> })
      ._caseViews;
    if (!caseViews) {
      return;
    }
    if (this.registeredKey && this.registeredKey !== key && caseViews[this.registeredKey] === this.ownView) {
      delete caseViews[this.registeredKey];
    }
    caseViews[key] = this.ownView;
    this.registeredKey = key;

    // 所有 setter 同步完成后统一冲刷。
    queueMicrotask(() => {
      (this.parent as unknown as SchemaDeferredNgPlural).flushQueued?.();
    });
  }
}
