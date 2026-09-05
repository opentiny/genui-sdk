import { EmbeddedViewRef, Type } from '@angular/core';

/** Set on factory `ɵcmp`. Block slot views stay detached until an NgContent outlet inserts them. */
export const RENDER_BLOCK_MARKER = '__renderBlock';

export function isRenderBlockType(type: Type<any> | null | undefined): boolean {
  return !!(type as any)?.ɵcmp?.[RENDER_BLOCK_MARKER];
}

/** Lives on the pipe's own `rootNodes` array — not a process-wide cache. */
const PROJECTED_VIEW = Symbol('projectedView');

/** Method key on RenderBlock — not a string, so it cannot clash with schema props. */
export const SET_PROJECTED_VIEWS = Symbol('setProjectedViews');

type SlotNodes = Node[] & { [PROJECTED_VIEW]?: EmbeddedViewRef<unknown> };

export function bindProjectedView(nodes: Node[], viewRef: EmbeddedViewRef<unknown>) {
  (nodes as SlotNodes)[PROJECTED_VIEW] = viewRef;
}

export function unbindProjectedView(nodes: Node[] | null | undefined) {
  if (nodes) {
    delete (nodes as SlotNodes)[PROJECTED_VIEW];
  }
}

export function projectedViewFromSlot(
  slot: Node[] | null | undefined,
): EmbeddedViewRef<unknown> | null {
  const viewRef = slot ? (slot as SlotNodes)[PROJECTED_VIEW] : undefined;
  return viewRef && !viewRef.destroyed ? viewRef : null;
}

/** Selector → slot view. Keys match `ɵcmp.ngContentSelectors` (`*` / `[header]` / …). */
export type ProjectedViews = Record<string, EmbeddedViewRef<unknown> | null>;

/** Read views off the live `projectNgContent` arrays (before Angular copies them). */
export function projectedViewsFromContent(
  content: Node[][] | null | undefined,
  selectors?: string[] | null,
): ProjectedViews | null {
  if (!content?.length) {
    return null;
  }
  const views: ProjectedViews = {};
  let hasView = false;
  for (let i = 0; i < content.length; i++) {
    const viewRef = projectedViewFromSlot(content[i]);
    views[selectors?.[i] ?? '*'] = viewRef;
    if (viewRef) {
      hasView = true;
    }
  }
  return hasView ? views : null;
}
