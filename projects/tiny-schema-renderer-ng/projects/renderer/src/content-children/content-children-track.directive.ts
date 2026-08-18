import {
  Directive,
  InjectionToken,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { ContentChildrenService } from './content-children.service';
import {
  setContentOutletLocalRef,
  setContentOutletSchemaIndex,
} from './content-children-patch';

/**
 * Provided on each `[componentOutlet]` host so descendants can resolve the parent outlet via DI.
 * Only meaningful when {@link ContentChildrenTrackDirective} is imported and the view injector
 * chain follows schema parents (see RendererDirective passing `injector` into createEmbeddedView).
 */
export const CONTENT_CHILDREN_OUTLET = new InjectionToken<ComponentOutlet>('CONTENT_CHILDREN_OUTLET');

/**
 * Optional plugin: attach to every `[componentOutlet]` when imported.
 * No-ops unless {@link ContentChildrenService} is provided by the host app.
 *
 * Bind `contentChildrenRef` from schema `props.refName` so `contentChild('xxx')` / `@ContentChild('xxx')`
 * can resolve the same way `#xxx` does in static templates.
 * (Schema `props.ref` is reserved for registering into `this.refs`.)
 */
@Directive({
  selector: '[componentOutlet]',
  standalone: true,
  providers: [
    {
      provide: CONTENT_CHILDREN_OUTLET,
      deps: [ComponentOutlet],
      useFactory: (outlet: ComponentOutlet) => outlet,
    },
  ],
})
export class ContentChildrenTrackDirective implements OnInit, OnChanges, OnDestroy {
  private readonly registry = inject(ContentChildrenService, { optional: true });
  private readonly self = inject(ComponentOutlet);
  private readonly parent = inject(CONTENT_CHILDREN_OUTLET, { optional: true, skipSelf: true });

  /**
   * Local template-ref name for string content queries (`contentChild('name')`).
   * Typically bound from schema: `[contentChildrenRef]="schema.props?.refName"`.
   */
  @Input() contentChildrenRef: string | null | undefined;

  /**
   * Schema declaration order key (`childIndex * STRIDE + loopIndex`) for this outlet,
   * set from the schema children iteration so content queries follow schema order
   * instead of projected DOM order (header slots render first).
   */
  @Input() contentChildrenIndex?: number;

  ngOnInit() {
    this.registry?.setContentOutletParent(this.self, this.parent ?? null);
    setContentOutletLocalRef(this.self, this.contentChildrenRef);
    setContentOutletSchemaIndex(this.self, this.contentChildrenIndex);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['contentChildrenRef']) {
      setContentOutletLocalRef(this.self, this.contentChildrenRef);
    }
    if (changes['contentChildrenIndex']) {
      setContentOutletSchemaIndex(this.self, this.contentChildrenIndex);
    }
  }

  ngOnDestroy() {
    setContentOutletLocalRef(this.self, null);
    this.registry?.removeContentOutlet(this.self);
  }
}
