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
 *    添加 `@Input('ngPluralCase')` setter，从 schema props 收到正确值后把
 *    `_caseViews` 中的 entry 从坏 key 挪到正确 key，再让父冲刷排队值。
 */
@Directive({
  selector: '[ngPluralCase]',
  standalone: true,
  inputs: ['ngPluralCase'],
  providers: [{ provide: NgPluralCase, useExisting: forwardRef(() => SchemaNgPluralCase) }],
})
export class SchemaNgPluralCase extends NgPluralCase {
  private readonly parent = inject(NgPlural, { skipSelf: true });

  constructor() {
    // @Attribute 拿不到值，给空串防止构造抛错；setter 会修复 key。
    super(
      '',
      inject(TemplateRef),
      inject(ViewContainerRef),
      inject(NgPlural, { skipSelf: true }),
    );
  }

  @Input('ngPluralCase')
  set attrFixNgPluralCase(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
      return;
    }
    const key = !isNaN(Number(value)) ? `=${value}` : String(value);
    const caseViews = (this.parent as unknown as { _caseViews?: Record<string, unknown> })
      ._caseViews;
    if (!caseViews) {
      return;
    }
    if (caseViews[key] !== undefined) {
      // 正确 key 已存在，仅清理坏 key。
      delete caseViews['='];
      delete caseViews[''];
      delete caseViews['null'];
      return;
    }
    const badView =
      caseViews['='] ?? caseViews[''] ?? caseViews['null'];
    if (badView === undefined) {
      return;
    }
    caseViews[key] = badView;
    delete caseViews['='];
    delete caseViews[''];
    delete caseViews['null'];

    // 所有 setter 同步完成后统一冲刷。
    queueMicrotask(() => {
      (this.parent as unknown as SchemaDeferredNgPlural).flushQueued?.();
    });
  }
}