import {
  Directive,
  DoCheck,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  runInInjectionContext,
  SimpleChange,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { toOnEventName } from './parser/event-utils';
import { setTemplateDirectiveInstances } from './content-children/content-children-patch';
import { ContentChildrenTrackTemplateDirective } from './content-children/content-children-track-template.directive';

/**
 * Dynamically instantiate directives on a schema `NgTemplate` host.
 *
 * Angular's public `createComponent({ directives })` only attaches directives to a
 * **component Element** host — that path does not provide `TemplateRef`, so it cannot
 * create real structural directives. Those must live on an `ng-template` Container.
 *
 * This host only:
 * - injects `TemplateRef` + `ViewContainerRef` (same pair a static structural directive gets)
 * - parents the directive injector on {@link schemaTemplateParentInjector} when set
 *   (projected slot views are not on the parent component injector by default)
 * - constructs via `ɵfac` inside `runInInjectionContext`
 * - registers instances for the content-children patch (native `@ContentChild` cannot see
 *   them — they are not in ng-template LView directive slots)
 * - re-provides each constructed instance so later same-TNode directives (companion
 *   bridges) can `inject()` the original directive instance and fix it up
 *
 * Host-token / attribute-token quirks belong in **bridge subclasses** registered in
 * `directiveMap` (e.g. SchemaNgSwitchCase / SchemaNgPluralCase), not in type switches here.
 *
 * Prefer **standalone** directive types (same as `createComponent` host directives).
 */
@Directive({
  selector: 'ng-template[schemaTemplateDirectives]',
  standalone: true,
})
export class SchemaTemplateDirectivesDirective implements OnChanges, DoCheck, OnDestroy {
  /**
   * Prefer the TemplateRef registered by {@link ContentChildrenTrackTemplateDirective}.
   * Under projected `childrenTemplate` / outer `#ngTemplate` wrappers, bare
   * `inject(TemplateRef)` can resolve a different TemplateRef than the track directive
   * (same host comment, different object) — which breaks content-children matching and
   * would stamp the wrong template into MatTable row/cell defs.
   */
  private readonly templateRef = resolveSchemaTemplateRef();
  private readonly viewContainerRef = inject(ViewContainerRef, { self: true });
  private readonly injector = inject(Injector);

  /** Resolved directive types from `schema.directives` (+ auto-apply). */
  @Input() schemaTemplateDirectiveTypes: Type<unknown>[] | undefined;

  /** Parsed schema `props` used as directive inputs / outputs. */
  @Input() schemaTemplateDirectiveProps: Record<string, unknown> | undefined;

  /**
   * Parent schema component's injector. Projected slot views are not parented on that
   * injector by default; bridges that `skipSelf` inject parent host tokens need this root.
   */
  @Input() schemaTemplateParentInjector: Injector | null | undefined;

  private instances: object[] = [];
  private readonly prevPropValues = new WeakMap<object, Record<string, unknown>>();
  private outputSubs: Subscription = new Subscription();
  private typesKey = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['schemaTemplateDirectiveTypes'] ||
      changes['schemaTemplateParentInjector']
    ) {
      const nextKey = this.typesIdentity(this.schemaTemplateDirectiveTypes);
      const parentChanged = !!changes['schemaTemplateParentInjector'];
      if (nextKey !== this.typesKey || parentChanged) {
        this.typesKey = nextKey;
        this.recreateInstances();
        return;
      }
    }
    if (changes['schemaTemplateDirectiveProps'] && this.instances.length) {
      this.applyInputsAndOutputs();
    }
  }

  ngDoCheck(): void {
    for (const instance of this.instances) {
      const hook = (instance as { ngDoCheck?: () => void }).ngDoCheck;
      if (typeof hook === 'function') {
        hook.call(instance);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyInstances();
  }

  private typesIdentity(types: Type<unknown>[] | undefined): string {
    if (!types?.length) {
      return '';
    }
    return types.map((t) => t.name).join(',');
  }

  private recreateInstances(): void {
    this.destroyInstances();
    const types = this.schemaTemplateDirectiveTypes ?? [];
    if (!types.length) {
      return;
    }

    const childInjector = this.createDirectiveInjector();

    for (const Dir of types) {
      const factory = (Dir as Type<unknown> & { ɵfac?: (t?: Type<unknown>) => object }).ɵfac;
      if (typeof factory !== 'function') {
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.warn(`[schemaTemplateDirectives] ${Dir.name} has no ɵfac; skip.`);
        }
        continue;
      }
      const instance = runInInjectionContext(childInjector, () => factory(Dir));
      this.instances.push(instance);
      const onInit = (instance as { ngOnInit?: () => void }).ngOnInit;
      if (typeof onInit === 'function') {
        onInit.call(instance);
      }
    }

    setTemplateDirectiveInstances(this.templateRef, this.instances);
    this.applyInputsAndOutputs();
  }

  private createDirectiveInjector(): Injector {
    const lookupRoot = this.schemaTemplateParentInjector ?? this.injector;
    return Injector.create({
      providers: [
        { provide: TemplateRef, useValue: this.templateRef },
        { provide: ViewContainerRef, useValue: this.viewContainerRef },
      ],
      parent: lookupRoot,
    });
  }

  private applyInputsAndOutputs(): void {
    this.resetOutputSubs();

    const props = this.schemaTemplateDirectiveProps ?? {};
    for (const instance of this.instances) {
      const def = (instance.constructor as Type<unknown> & { ɵdir?: DirectiveDefLike }).ɵdir;
      if (!def) {
        continue;
      }

      const prev = this.prevPropValues.get(instance) ?? {};
      const nextPrev: Record<string, unknown> = { ...prev };
      const changes: SimpleChanges = {};

      for (const publicName of Object.keys(def.inputs ?? {})) {
        const propName = resolveInputPropName(def.inputs![publicName], publicName);
        if (!(publicName in props) && !(propName in props)) {
          continue;
        }
        const value = publicName in props ? props[publicName] : props[propName];
        const firstChange = !(propName in prev);
        if (firstChange || !Object.is(prev[propName], value)) {
          changes[propName] = new SimpleChange(prev[propName], value, firstChange);
          (instance as Record<string, unknown>)[propName] = value;
          nextPrev[propName] = value;
        }
      }

      this.prevPropValues.set(instance, nextPrev);

      if (Object.keys(changes).length) {
        const onChanges = (instance as { ngOnChanges?: (c: SimpleChanges) => void }).ngOnChanges;
        if (typeof onChanges === 'function') {
          onChanges.call(instance, changes);
        }
      }

      for (const publicName of Object.keys(def.outputs ?? {})) {
        const propName = resolveInputPropName(def.outputs![publicName], publicName);
        const onEventName = toOnEventName(publicName);
        const handler = props[onEventName];
        const emitter = (instance as Record<string, unknown>)[propName] as
          | { subscribe?: (fn: (...args: unknown[]) => void) => Subscription }
          | undefined;
        if (typeof handler === 'function' && emitter?.subscribe) {
          this.outputSubs.add(
            emitter.subscribe((...args: unknown[]) => {
              (handler as (...a: unknown[]) => void)(...args);
            }),
          );
        }
      }
    }
  }

  private destroyInstances(): void {
    this.resetOutputSubs();
    for (const instance of this.instances) {
      const onDestroy = (instance as { ngOnDestroy?: () => void }).ngOnDestroy;
      if (typeof onDestroy === 'function') {
        onDestroy.call(instance);
      }
    }
    this.instances = [];
    setTemplateDirectiveInstances(this.templateRef, []);
    this.viewContainerRef.clear();
  }

  private resetOutputSubs(): void {
    this.outputSubs.unsubscribe();
    this.outputSubs = new Subscription();
  }
}

function resolveSchemaTemplateRef(): TemplateRef<unknown> {
  const track = inject(ContentChildrenTrackTemplateDirective, { optional: true, self: true });
  if (track) {
    return track.templateRef;
  }
  return inject(TemplateRef<unknown>, { self: true });
}

interface DirectiveDefLike {
  inputs?: Record<string, string | string[]>;
  outputs?: Record<string, string | string[]>;
}

function resolveInputPropName(
  mapping: string | string[] | undefined,
  publicName: string,
): string {
  if (typeof mapping === 'string') {
    return mapping;
  }
  if (Array.isArray(mapping) && typeof mapping[0] === 'string') {
    return mapping[0];
  }
  return publicName;
}

declare const ngDevMode: boolean | undefined;
