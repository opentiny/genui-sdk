import { Directive, InjectionToken, OnDestroy, OnInit, inject } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { ContentChildrenService } from './content-children.service';

/**
 * Provided on each `[componentOutlet]` host so descendants can resolve the parent outlet via DI.
 * Only meaningful when {@link ContentChildrenTrackDirective} is imported and the view injector
 * chain follows schema parents (see RendererDirective passing `injector` into createEmbeddedView).
 */
export const CONTENT_CHILDREN_OUTLET = new InjectionToken<ComponentOutlet>('CONTENT_CHILDREN_OUTLET');

/**
 * Optional plugin: attach to every `[componentOutlet]` when imported.
 * No-ops unless {@link ContentChildrenService} is provided by the host app.
 * Does not require extra template bindings.
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
export class ContentChildrenTrackDirective implements OnInit, OnDestroy {
  private readonly registry = inject(ContentChildrenService, { optional: true });
  private readonly self = inject(ComponentOutlet);
  private readonly parent = inject(CONTENT_CHILDREN_OUTLET, { optional: true, skipSelf: true });

  ngOnInit() {
    this.registry?.setContentOutletParent(this.self, this.parent ?? null);
  }

  ngOnDestroy() {
    this.registry?.removeContentOutlet(this.self);
  }
}
