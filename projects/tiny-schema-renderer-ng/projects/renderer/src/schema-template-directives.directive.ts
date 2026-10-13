import {
  Directive,
  DoCheck,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  Provider,
  runInInjectionContext,
  SimpleChange,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';
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
  /** Last types array compared by element reference (not `Type.name`). */
  private lastTypes: Type<unknown>[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['schemaTemplateDirectiveTypes'] ||
      changes['schemaTemplateParentInjector']
    ) {
      const nextTypes = this.schemaTemplateDirectiveTypes ?? [];
      const parentChanged = !!changes['schemaTemplateParentInjector'];
      if (!sameTypeList(this.lastTypes, nextTypes) || parentChanged) {
        this.lastTypes = nextTypes.slice();
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

  private recreateInstances(): void {
    this.destroyInstances();
    const types = this.schemaTemplateDirectiveTypes ?? [];
    if (!types.length) {
      return;
    }

    let childInjector = this.createBaseDirectiveInjector();
    const pendingInits: Array<() => void> = [];

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
      // Chain so later factories (e.g. SchemaNgSwitchCase) can skipSelf-inject prior
      // tokens (NgSwitch / NgPlural) declared via useExisting on the same template.
      childInjector = Injector.create({
        providers: providersForDirectiveInstance(Dir, instance),
        parent: childInjector,
      });

      const onInit = (instance as { ngOnInit?: () => void }).ngOnInit;
      if (typeof onInit === 'function') {
        pendingInits.push(() => onInit.call(instance));
      }
    }

    setTemplateDirectiveInstances(this.templateRef, this.instances);
    // Inputs / ngOnChanges before ngOnInit (Angular construction order).
    this.applyInputsAndOutputs();
    for (const init of pendingInits) {
      init();
    }
  }

  private createBaseDirectiveInjector(): Injector {
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
        const mapping = def.inputs![publicName];
        const { propName, flags, transform } = resolveInputMapping(mapping, publicName);
        if (!(publicName in props) && !(propName in props)) {
          continue;
        }
        const raw = publicName in props ? props[publicName] : props[propName];
        const value = applyInputTransform(instance, propName, flags, transform, raw);
        const firstChange = !(propName in prev);
        if (firstChange || !Object.is(prev[propName], value)) {
          changes[propName] = new SimpleChange(prev[propName], value, firstChange);
          writeDirectiveInput(instance, propName, flags, value);
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

function sameTypeList(a: Type<unknown>[], b: Type<unknown>[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function providersForDirectiveInstance(Dir: Type<unknown>, instance: object): Provider[] {
  const providers: Provider[] = [{ provide: Dir, useValue: instance }];
  const def = (Dir as Type<unknown> & { ɵdir?: { providers?: unknown[] } }).ɵdir;
  const declared = def?.providers;
  if (!Array.isArray(declared)) {
    return providers;
  }
  for (const entry of declared) {
    if (!entry || typeof entry !== 'object' || !('provide' in entry)) {
      continue;
    }
    const token = (entry as { provide: unknown }).provide;
    if (token != null && token !== Dir) {
      providers.push({ provide: token as Type<unknown>, useValue: instance });
    }
  }
  return providers;
}

function resolveSchemaTemplateRef(): TemplateRef<unknown> {
  const track = inject(ContentChildrenTrackTemplateDirective, { optional: true, self: true });
  if (track) {
    return track.templateRef;
  }
  return inject(TemplateRef<unknown>, { self: true });
}

/** Mirrors Angular `InputFlags` for directive def input tuples. */
const INPUT_FLAG_SIGNAL = 1;
const INPUT_FLAG_TRANSFORM = 2;

type InputMapping = string | string[] | [string, number, ((v: unknown) => unknown) | null];

interface DirectiveDefLike {
  inputs?: Record<string, InputMapping>;
  outputs?: Record<string, string | string[]>;
}

function resolveInputMapping(
  mapping: InputMapping | undefined,
  publicName: string,
): {
  propName: string;
  flags: number;
  transform: ((v: unknown) => unknown) | null;
} {
  if (typeof mapping === 'string') {
    return { propName: mapping, flags: 0, transform: null };
  }
  if (Array.isArray(mapping) && typeof mapping[0] === 'string') {
    const flags = typeof mapping[1] === 'number' ? mapping[1] : 0;
    const transform =
      typeof mapping[1] === 'number' && typeof mapping[2] === 'function'
        ? (mapping[2] as (v: unknown) => unknown)
        : null;
    return { propName: mapping[0], flags, transform };
  }
  return { propName: publicName, flags: 0, transform: null };
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

function applyInputTransform(
  instance: object,
  propName: string,
  flags: number,
  transform: ((v: unknown) => unknown) | null,
  raw: unknown,
): unknown {
  const field = (instance as Record<string, unknown>)[propName];
  const signalNode =
    field != null && typeof field === 'object'
      ? (field as { [SIGNAL]?: { transformFn?: (v: unknown) => unknown } })[SIGNAL]
      : undefined;
  if (signalNode?.transformFn) {
    return signalNode.transformFn(raw);
  }
  if (transform != null && (flags & INPUT_FLAG_TRANSFORM) !== 0) {
    return transform.call(instance, raw);
  }
  if (transform != null) {
    return transform.call(instance, raw);
  }
  return raw;
}

/**
 * Write an input without replacing signal-input fields (`input()`).
 * Decorator inputs still assign the property; signal inputs update via the node API.
 */
function writeDirectiveInput(
  instance: object,
  propName: string,
  flags: number,
  value: unknown,
): void {
  const field = (instance as Record<string, unknown>)[propName];
  const signalNode =
    field != null && typeof field === 'object'
      ? (field as {
          [SIGNAL]?: {
            applyValueToInputSignal?: (node: unknown, v: unknown) => void;
          };
        })[SIGNAL]
      : undefined;
  if (signalNode != null && typeof signalNode.applyValueToInputSignal === 'function') {
    signalNode.applyValueToInputSignal(signalNode, value);
    return;
  }
  if ((flags & INPUT_FLAG_SIGNAL) !== 0 && field != null && typeof (field as { set?: (v: unknown) => void }).set === 'function') {
    (field as { set: (v: unknown) => void }).set(value);
    return;
  }
  (instance as Record<string, unknown>)[propName] = value;
}

declare const ngDevMode: boolean | undefined;
