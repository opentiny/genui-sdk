import {
  Directive,
  InjectionToken,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  SimpleChanges,
  SkipSelf,
} from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { ContentChildrenService } from './content-children.service';
import {
  registerContentRef,
  setContentOutletSchemaIndex,
  unregisterContentRef,
} from './content-children-patch';

/**
 * Provided on each `[componentOutlet]` host so descendants resolve the parent outlet via DI.
 * Only meaningful when {@link ContentChildrenTrackDirective} is imported.
 */
export const CONTENT_CHILDREN_OUTLET = new InjectionToken<ComponentOutlet>('CONTENT_CHILDREN_OUTLET');

/**
 * Optional plugin attached to every `[componentOutlet]` when imported. No-ops unless
 * {@link ContentChildrenService} is provided. Registers each outlet in the parent's
 * content-ref registry so `contentChild('name')` / `@ContentChild` resolve it.
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
  /** Local name for string content queries (`contentChild('name')`), from schema `props.refName`. */
  @Input() contentChildrenRef: string | null | undefined;

  /** Schema declaration order key (`childIndex * STRIDE + loopIndex`) for this outlet. */
  @Input() contentChildrenIndex?: number;

  constructor(
    @Optional() private readonly registry: ContentChildrenService | null,
    private readonly self: ComponentOutlet,
    @Optional()
    @SkipSelf()
    private readonly parent: ComponentOutlet | null,
  ) {}

  ngOnInit() {
    this.registry?.setContentOutletParent(this.self, this.parent ?? null);
    setContentOutletSchemaIndex(this.self, this.contentChildrenIndex);
    if (this.parent) {
      registerContentRef(this.parent, {
        kind: 'outlet',
        outlet: this.self,
        refName: this.contentChildrenRef ?? null,
        index: this.contentChildrenIndex,
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['contentChildrenIndex']) {
      setContentOutletSchemaIndex(this.self, this.contentChildrenIndex);
    }
    if ((changes['contentChildrenRef'] || changes['contentChildrenIndex']) && this.parent) {
      registerContentRef(this.parent, {
        kind: 'outlet',
        outlet: this.self,
        refName: this.contentChildrenRef ?? null,
        index: this.contentChildrenIndex,
      });
    }
  }

  ngOnDestroy() {
    setContentOutletSchemaIndex(this.self, undefined);
    if (this.parent) {
      unregisterContentRef(this.parent, { kind: 'outlet', outlet: this.self, refName: null });
    }
    this.registry?.removeContentOutlet(this.self);
  }
}
