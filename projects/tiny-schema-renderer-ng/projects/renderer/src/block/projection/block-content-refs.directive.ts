import { Directive, EmbeddedViewRef } from '@angular/core';
import { ComponentOutlet } from '../../component-outlet';
import { hasContentRefsDecl, resolveBlockContentRefs } from '../resolve-content-refs';
import { projectedViewFromSlot, SET_CONTENT_REFS } from './projected-view';

type ContentRefsHost = {
  [SET_CONTENT_REFS]?: (refs: Record<string, unknown> | null) => void;
  _schema?: { contentRefs?: Record<string, string> };
};

/**
 * Resolves block schema `contentRefs` into runtime TemplateRef / instances.
 * Timing is owned by {@link BlockProjectedViewsDirective}: call
 * {@link applyContentRefs} after `SET_PROJECTED_VIEWS`, before host CD.
 */
@Directive({
  selector: '[componentOutlet]',
  standalone: true,
})
export class BlockContentRefsDirective {
  constructor(private readonly outlet: ComponentOutlet) {}

  /**
   * Early-CD projected slots so `refName` registers, then push resolved values.
   * @returns true when the block declares `contentRefs` (caller should host CD).
   */
  applyContentRefs(
    instance: object | null,
    content: Node[][] | undefined,
  ): boolean {
    const host = instance as ContentRefsHost | null;
    if (!host || typeof host[SET_CONTENT_REFS] !== 'function') {
      return false;
    }
    if (!hasContentRefsDecl(host._schema)) {
      return false;
    }
    this.detectProjectedSlotViews(content);
    host[SET_CONTENT_REFS]!(
      resolveBlockContentRefs(this.outlet, host._schema?.contentRefs),
    );
    return true;
  }

  private detectProjectedSlotViews(content: Node[][] | undefined) {
    if (!content?.length) {
      return;
    }
    const componentInjector = this.outlet.componentInjector;
    for (const slot of content) {
      const viewRef = projectedViewFromSlot(slot) as EmbeddedViewRef<unknown> | null;
      if (viewRef && !viewRef.destroyed) {
        (viewRef.context as { componentInjector?: unknown }).componentInjector =
          componentInjector;
        viewRef.detectChanges();
      }
    }
  }
}
