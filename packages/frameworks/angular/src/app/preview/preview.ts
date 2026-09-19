import { Component, type Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import * as generated from './generated/schema-card';

/**
 * 出码实时预览页。
 *
 * 用法:在 5175 的出码页点「执行出码」→ 复制结果 → 整份覆盖
 * `src/app/preview/generated/schema-card.ts` 保存 → 本页由 Angular dev server
 * 重新编译(整页刷新)后渲染出新结果。
 *
 * 这里**不按名字取导出**,而是筛出构造器上带 ɵcmp 的那个类:AOT 编译过的组件类必定带
 * ɵcmp(仓库里已有同款判法,见 renderer 的 material-getter.ts、get-directive.pipe.ts)。
 * 这样出码时改了 pageInfo.name(类名随之变)也不用回来改本文件。
 *
 * 注意本文件与产物进的是同一个 TS program:产物编不过时**整个应用**(含 / 的 chat 页)
 * 都会编不过,没有隔离手段。页面变红就去修好或还原 generated/schema-card.ts。
 */
const componentType =
  (Object.values(generated).find((v) => typeof v === 'function' && 'ɵcmp' in v) as
    | unknown
    | undefined) as Type<unknown> | undefined;

@Component({
  selector: 'app-preview',
  imports: [NgComponentOutlet],
  templateUrl: './preview.html',
  styleUrls: ['./preview.less'],
})
export class Preview {
  protected readonly componentType = componentType ?? null;
}
