import { Directive, inject } from '@angular/core';
import { MatExpansionPanel } from '@angular/material/expansion';

/**
 * 原因：Host 注入。
 * 官方假设：Header 写在 Panel 投影里，`{ host: true }` 能在 Header 宿主上拿到 MatExpansionPanel。
 * schema 时序：createComponent 出 Header 时还不是 Panel 的 DOM 子节点，注入失败。
 *
 * 只挂在 schema 的 MatExpansionPanelHeader 上，不改官方 Expansion 类。
 */
@Directive({
  selector: '[matExpansionPanelParent]',
  standalone: true,
  providers: [
    {
      provide: MatExpansionPanel,
      useFactory: () => inject(MatExpansionPanel, { skipSelf: true }),
    },
  ],
})
export class MatExpansionPanelParentBridge {}
