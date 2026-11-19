import { Directive, EmbeddedViewRef, Input, OnChanges, OnDestroy, ViewContainerRef } from '@angular/core';
import { ProjectedViews } from './projected-view';

@Directive({
  selector: '[renderNgContent]',
  standalone: true,
})
export class RenderNgContentDirective implements OnChanges, OnDestroy {
  @Input() projectableViews: ProjectedViews | null = null;
  @Input() select: string | null = null;

  private insertedView: EmbeddedViewRef<unknown> | null = null;

  constructor(private viewContainerRef: ViewContainerRef) {}

  ngOnChanges() {
    this.releaseInserted();
    const viewRef = this.projectableViews?.[this.select?.trim() || '*'];
    if (!viewRef || viewRef.destroyed) {
      return;
    }
    if (viewRef !== this.insertedView) {
      viewRef.detach();
    }
    this.viewContainerRef.insert(viewRef);
    this.insertedView = viewRef;
  }

  ngOnDestroy() {
    this.releaseInserted();
  }

  private releaseInserted() {
    if (this.insertedView && !this.insertedView.destroyed) {
      this.insertedView.detach();
    }
    this.insertedView = null;
  }
}
