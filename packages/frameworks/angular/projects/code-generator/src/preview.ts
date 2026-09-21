import { Component, type Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import * as generated from './generated/schema-card';

/**
 * 出码实时预览页。
 *
 * 用法:在 5175 的出码页点「执行出码」→ 复制结果 → 整份覆盖
 * `projects/code-generator/src/generated/schema-card.ts` 保存 → 本页由 Angular
 * dev server 重新编译(整页刷新)后渲染出新结果。
 *
 * 这里**不按名字取导出**,而是筛出构造器上带 ɵcmp 的那个类:AOT 编译过的组件类必定带
 * ɵcmp(仓库里已有同款判法,见 renderer 的 material-getter.ts、get-directive.pipe.ts)。
 * 这样出码时改了 pageInfo.name(类名随之变)也不用回来改本文件。
 *
 * 本 app 只编译 preview*.ts 与 generated/(见 src/tsconfig.app.json 的 include):
 * 产物编不过时只有本页变红,同目录的 5175 出码页不受牵连 —— 当初和 chat 页同在
 * renderer-use 里时,产物编不过会把整个应用一起拖挂。变红就修好或还原 generated/。
 */
const componentType =
  (Object.values(generated).find((v) => typeof v === 'function' && 'ɵcmp' in v) as
    | unknown
    | undefined) as Type<unknown> | undefined;

@Component({
  selector: 'app-preview',
  imports: [NgComponentOutlet],
  // 模板内联:本目录已有一个 preview.html 是 app 入口页,同名会撞车;这模板只 20 行。
  template: `
    <div class="preview-container">
      <header class="preview-head">
        <h1>出码实时预览</h1>
        <p class="hint">
          在
          <a href="http://localhost:5175" target="_blank" rel="noopener">5175 出码页</a>
          点「执行出码」→ 复制 → 整份覆盖
          <code>projects/code-generator/src/generated/schema-card.ts</code>
          保存,本页会自动重新编译。
        </p>
        <p class="warn">
          产物编不过时本页会整页变红,不影响其它页面 —— 修好或还原
          <code>generated/schema-card.ts</code> 即恢复。完整错误列表在终端 <code>preview</code> 那一栏。
        </p>
      </header>

      @if (componentType) {
        <section class="preview-stage">
          <ng-container [ngComponentOutlet]="componentType" />
        </section>
      } @else {
        <p class="empty">在 generated/schema-card.ts 里没找到已编译的组件类(缺 ɵcmp)。</p>
      }
    </div>
  `,
  styleUrls: ['./preview.less'],
})
export class Preview {
  protected readonly componentType = componentType ?? null;
}
