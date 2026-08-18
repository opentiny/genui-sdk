import {
  QueryList,
  TemplateRef,
  Type,
  signal,
  ɵgetDirectives,
  ɵgetLContext as getLContext,
} from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';
import { ComponentOutlet } from '../component-outlet';

/** Angular 20 LView header slot for LQueries (best-effort; falls back to shape scan). */
const LVIEW_QUERIES_INDEX = 18;

export interface ContentQueryPatchTarget {
  kind: 'query-list' | 'signal';
  propertyName: string | null;
  queryList: QueryList<unknown>;
  /** Content query predicate (component/directive type or string selectors), if recoverable. */
  predicate: unknown;
  /** Signal node for contentChildren()/contentChild(); null for decorator QueryList fields. */
  signalNode?: any;
  /** true for contentChild() / @ContentChild (single result). */
  firstOnly?: boolean;
  /** Host component instance — needed to install signal shims. */
  hostInstance?: object;
}

/** Shim signals replacing material contentChild(ren)() fields (LView rematerialize would wipe QueryList-only patches). */
const signalShims = new WeakMap<object, ReturnType<typeof signal<any>>>();

/** Persist shim bindings per host — after field replace, discover no longer sees query signals. */
const hostShimBindings = new WeakMap<
  object,
  Array<{
    signalNode: object;
    propertyName: string;
    firstOnly: boolean;
    predicate: unknown;
  }>
>();

/**
 * Schema `props.refName` (template-local name) per outlet — mirrors Angular `#name` for
 * `contentChild('name')` / `@ContentChild('name')` string selectors.
 * Schema `props.ref` is reserved for `this.refs` registration.
 */
const outletLocalRefs = new WeakMap<ComponentOutlet, string>();

/** Schema `NgTemplate` nodes → real TemplateRefs projected under a parent outlet. */
export interface ProjectedTemplateEntry {
  templateRef: TemplateRef<unknown>;
  refName: string | null;
  /**
   * Schema declaration order key, same scale as outlet schema indexes
   * (childIndex * {@link SCHEMA_INDEX_STRIDE} + loopIndex). Lets projected templates
   * interleave with child outlets in schema order instead of projection/DOM order.
   */
  index?: number;
}

/**
 * Multiplier for the child-index part of a schema order key. Loop items expand
 * in place, so positions are `childIndex * STRIDE + loopIndex`.
 */
export const SCHEMA_INDEX_STRIDE = 10000;

/**
 * Schema declaration order key per outlet (childIndex * STRIDE + loopIndex),
 * set from the schema children iteration (see ContentChildrenTrackDirective).
 */
const outletSchemaIndex = new WeakMap<ComponentOutlet, number>();

export function setContentOutletSchemaIndex(
  outlet: ComponentOutlet,
  index: number | undefined,
): void {
  if (typeof index === 'number' && Number.isFinite(index)) {
    outletSchemaIndex.set(outlet, index);
  } else {
    outletSchemaIndex.delete(outlet);
  }
}

export function getContentOutletSchemaIndex(outlet: ComponentOutlet): number | undefined {
  return outletSchemaIndex.get(outlet);
}

const projectedTemplatesByParent = new WeakMap<ComponentOutlet, ProjectedTemplateEntry[]>();

/** Schema componentName for the NgTemplate bypass (not a material). */
export const NG_TEMPLATE_SCHEMA_NAME = 'NgTemplate';

/** Register a local template-ref name for an outlet (from props.refName). */
export function setContentOutletLocalRef(
  outlet: ComponentOutlet,
  ref: string | null | undefined,
): void {
  if (typeof ref === 'string' && ref.trim()) {
    outletLocalRefs.set(outlet, ref.trim());
  } else {
    outletLocalRefs.delete(outlet);
  }
}

export function getContentOutletLocalRef(outlet: ComponentOutlet): string | null {
  return outletLocalRefs.get(outlet) ?? null;
}

export function registerProjectedTemplate(
  parentOutlet: ComponentOutlet,
  templateRef: TemplateRef<unknown>,
  refName?: string | null,
  index?: number,
): void {
  let list = projectedTemplatesByParent.get(parentOutlet);
  if (!list) {
    list = [];
    projectedTemplatesByParent.set(parentOutlet, list);
  }
  const existing = list.find((e) => e.templateRef === templateRef);
  const name = typeof refName === 'string' && refName.trim() ? refName.trim() : null;
  if (existing) {
    existing.refName = name;
    if (typeof index === 'number') {
      existing.index = index;
    }
    return;
  }
  list.push({ templateRef, refName: name, index });
}

export function unregisterProjectedTemplate(
  parentOutlet: ComponentOutlet,
  templateRef: TemplateRef<unknown>,
): void {
  const list = projectedTemplatesByParent.get(parentOutlet);
  if (!list?.length) {
    return;
  }
  const index = list.findIndex((e) => e.templateRef === templateRef);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

export function getProjectedTemplates(parentOutlet: ComponentOutlet): ProjectedTemplateEntry[] {
  return projectedTemplatesByParent.get(parentOutlet)?.slice() ?? [];
}

function rememberShimBinding(
  host: object,
  signalNode: object,
  propertyName: string,
  firstOnly: boolean,
  predicate: unknown,
): void {
  let list = hostShimBindings.get(host);
  if (!list) {
    list = [];
    hostShimBindings.set(host, list);
  }
  const existing = list.find((b) => b.signalNode === signalNode);
  if (existing) {
    existing.predicate = predicate ?? existing.predicate;
    existing.firstOnly = firstOnly;
    existing.propertyName = propertyName;
    return;
  }
  list.push({ signalNode, propertyName, firstOnly, predicate });
}

function isQuerySignal(value: unknown): value is ((...args: any[]) => any) {
  if (typeof value !== 'function') {
    return false;
  }
  const node = (value as any)[SIGNAL];
  return !!node && node._queryList instanceof QueryList;
}

/** Read predicate from a bound query signal node (no signal read → no QueryList wipe). */
function getPredicateFromSignalNode(node: any): unknown {
  try {
    const lView = node?._lView;
    const queryIndex = node?._queryIndex;
    if (lView == null || queryIndex == null) {
      return null;
    }
    const tView = lView[1];
    const queries = tView?.queries;
    if (!queries) {
      return null;
    }
    if (typeof queries.getByIndex === 'function') {
      return queries.getByIndex(queryIndex)?.metadata?.predicate ?? null;
    }
    return queries.queries?.[queryIndex]?.metadata?.predicate ?? null;
  } catch {
    return null;
  }
}

function findLQueries(lView: any): { queries: Array<{ queryList: QueryList<unknown>; matches?: unknown }> } | null {
  const slot = lView?.[LVIEW_QUERIES_INDEX];
  if (slot?.queries && Array.isArray(slot.queries) && slot.queries[0]?.queryList instanceof QueryList) {
    return slot;
  }
  for (let i = 0; i < 40; i++) {
    const candidate = lView?.[i];
    if (
      candidate?.queries &&
      Array.isArray(candidate.queries) &&
      candidate.queries[0]?.queryList instanceof QueryList
    ) {
      return candidate;
    }
  }
  return null;
}

function getTQueries(lView: any): { queries?: Array<{ metadata?: { predicate?: unknown }; _declarationNodeIndex?: number }> } | null {
  const tView = lView?.[1];
  const queries = tView?.queries;
  if (!queries) {
    return null;
  }
  // TQueries_ exposes `.queries` array
  if (Array.isArray(queries.queries)) {
    return queries;
  }
  if (Array.isArray(queries)) {
    return { queries };
  }
  return null;
}

/**
 * Ivy: view queries are created with declarationNodeIndex -1; content queries use the host tNode index.
 * Also tView.contentQueries lists content-query indices as [queryIndex, directiveIndex, ...].
 * Patching ViewChild QueryLists (e.g. TiTabs #slider) wipes them and breaks slider position.
 */
function isContentQueryIndex(lView: any, queryIndex: number): boolean {
  const tView = lView?.[1];
  const contentQueries = tView?.contentQueries;
  if (Array.isArray(contentQueries) && contentQueries.length) {
    for (let i = 0; i < contentQueries.length; i += 2) {
      if (contentQueries[i] === queryIndex) {
        return true;
      }
    }
    return false;
  }
  const tQueries = getTQueries(lView);
  const tQuery =
    typeof tView?.queries?.getByIndex === 'function'
      ? tView.queries.getByIndex(queryIndex)
      : tQueries?.queries?.[queryIndex];
  if (tQuery == null) {
    return false;
  }
  // View query: createTQuery(..., -1)
  return tQuery._declarationNodeIndex !== -1;
}

/**
 * Infer contentChild vs contentChildren without reading the query signal.
 * Reading would call refreshSignalQuery → QueryList.reset(empty) and fight our patch.
 */
function inferFirstOnly(propertyName: string): boolean {
  if (/children|items/i.test(propertyName)) {
    return false;
  }
  // contentChild('x') fields are often header/footer/title/named*/ *Ref / *Child
  if (/child$|header|footer|title|template|^named|ref$/i.test(propertyName)) {
    return true;
  }
  return !/s$/i.test(propertyName);
}

/**
 * Property names written or declared by the compiled viewQuery fn — @ViewChild/@ViewChildren
 * (update phase `ctx.foo = _t`) and viewChild()/viewChildren() signals (create phase
 * `ɵɵviewQuerySignal(ctx.foo, ...)`). Content patching must never touch them: wiping e.g.
 * TiDateComponent.dateEditComs resets its matches and breaks `focus()` on dropdown open.
 * Same source-parsing technique as {@link bindDecoratorQueryPropertyNames} for contentQueries.
 *
 * Content-query signal fields (`ɵɵcontentQuerySignal(dirIndex, ctx.foo, ...)`) live in the
 * contentQueries fn, never here, so they are patched as before.
 */
const viewQueryPropsByClass = new WeakMap<object, Set<string>>();

function getViewQueryPropertyNames(instance: object): Set<string> {
  const ctor = instance.constructor as object;
  let names = viewQueryPropsByClass.get(ctor);
  if (names) {
    return names;
  }
  names = new Set<string>();
  const viewQuery = (ctor as any)?.ɵcmp?.viewQuery;
  if (typeof viewQuery === 'function') {
    const src = Function.prototype.toString.call(viewQuery);
    // decorator @ViewChild/@ViewChildren update assignments
    for (const m of src.matchAll(/ctx\.([A-Za-z_$][\w$]*)\s*=/g)) {
      names.add(m[1]);
    }
    // signal viewChild()/viewChildren() create declarations
    for (const m of src.matchAll(/ɵɵviewQuerySignal\(\s*ctx\.([A-Za-z_$][\w$]*)\s*,/g)) {
      names.add(m[1]);
    }
  }
  viewQueryPropsByClass.set(ctor, names);
  return names;
}

/**
 * Discover content-query QueryLists on a component instance.
 * Prefers LView query metadata; falls back to enumerating instance QueryList / query-signal fields.
 * Skips view queries (@ViewChild / viewChild) — only content queries are patched.
 */
export function discoverContentQueryTargets(instance: object): ContentQueryPatchTarget[] {
  const targets: ContentQueryPatchTarget[] = [];
  const seen = new Set<QueryList<unknown>>();

  try {
    const ctx = getLContext(instance);
    const lView = ctx?.lView;
    if (lView) {
      const lQueries = findLQueries(lView);
      const tQueries = getTQueries(lView);
      if (lQueries) {
        lQueries.queries.forEach((lQuery, index) => {
          if (!isContentQueryIndex(lView, index)) {
            return;
          }
          const queryList = lQuery.queryList;
          if (!(queryList instanceof QueryList) || seen.has(queryList)) {
            return;
          }
          seen.add(queryList);
          const predicate = tQueries?.queries?.[index]?.metadata?.predicate ?? null;
          targets.push({
            kind: 'query-list',
            propertyName: null,
            queryList,
            predicate,
            hostInstance: instance,
          });
        });
      }
    }
  } catch {
    // getLContext can throw if instance is not in a live view yet.
  }

  const viewQueryProps = getViewQueryPropertyNames(instance);
  for (const key of Object.keys(instance as object)) {
    const value = (instance as any)[key];
    if (value instanceof QueryList) {
      // @ViewChildren fields (compiled viewQuery assignments) are resolved by Angular —
      // patching them wipes matches and breaks the component (e.g. TiDate.dateEditComs).
      if (viewQueryProps.has(key)) {
        continue;
      }
      if (seen.has(value)) {
        const existing = targets.find((t) => t.queryList === value);
        if (existing && !existing.propertyName) {
          existing.propertyName = key;
        }
        continue;
      }
      seen.add(value);
      targets.push({
        kind: 'query-list',
        propertyName: key,
        queryList: value,
        predicate: null,
        // @ContentChild still uses QueryList; treat short name heuristic as firstOnly when patched via property
        firstOnly: /^(first|header|item|child|contentTemplate)/i.test(key) && !/s$/i.test(key),
        hostInstance: instance,
      });
    } else if (isQuerySignal(value)) {
      const node = (value as any)[SIGNAL];
      // viewChild()/viewChildren() signals (declared in the compiled viewQuery fn) are
      // resolved by Angular — never patch them. Content signals stay patchable.
      if (viewQueryProps.has(key)) {
        continue;
      }
      const queryList = node._queryList as QueryList<unknown>;
      const firstOnly = inferFirstOnly(key);
      const signalPredicate = getPredicateFromSignalNode(node);
      if (seen.has(queryList)) {
        const existing = targets.find((t) => t.queryList === queryList);
        if (existing) {
          existing.kind = 'signal';
          existing.propertyName = key;
          existing.signalNode = node;
          existing.firstOnly = firstOnly;
          existing.hostInstance = instance;
          if (existing.predicate == null && signalPredicate != null) {
            existing.predicate = signalPredicate;
          }
        }
        continue;
      }
      seen.add(queryList);
      targets.push({
        kind: 'signal',
        propertyName: key,
        queryList,
        predicate: signalPredicate,
        signalNode: node,
        firstOnly,
        hostInstance: instance,
      });
    }
  }

  return targets;
}

function getExportAsNames(type: Type<any> | null | undefined): string[] {
  if (!type) {
    return [];
  }
  const def = (type as any).ɵcmp ?? (type as any).ɵdir;
  const exportAs = def?.exportAs;
  if (!exportAs) {
    return [];
  }
  if (Array.isArray(exportAs)) {
    return exportAs.map(String);
  }
  return String(exportAs)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Component + host directives on an outlet (Angular content queries can target either).
 * Prefer live `ɵgetDirectives(hostEl)`; fall back to component instance + declared directive types.
 */
export function getOutletQueryCandidates(outlet: ComponentOutlet): object[] {
  const seen = new Set<object>();
  const result: object[] = [];
  const add = (value: object | null | undefined) => {
    if (value != null && !seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  };

  const hostEl = outlet.componentRef?.location?.nativeElement;
  if (hostEl != null) {
    try {
      for (const dir of ɵgetDirectives(hostEl)) {
        add(dir as object);
      }
    } catch {
      // Host may not be an Angular element yet.
    }
  }

  add(outlet.componentInstance);

  const injector = outlet.componentInjector ?? outlet.componentRef?.injector;
  if (injector) {
    for (const Dir of outlet.ngComponentOutletDirectives ?? []) {
      try {
        add(injector.get(Dir, null, { optional: true, self: true }) as object | null);
      } catch {
        // ignore
      }
    }
  }

  return result;
}

/** Local names that string predicates (`contentChild('x')`) can match on this outlet. */
export function getContentOutletQueryNames(outlet: ComponentOutlet): string[] {
  const names = new Set<string>();
  const ref = outletLocalRefs.get(outlet);
  if (ref) {
    names.add(ref);
  }
  for (const name of getExportAsNames(outlet.ngComponentOutlet)) {
    names.add(name);
  }
  for (const Dir of outlet.ngComponentOutletDirectives ?? []) {
    for (const name of getExportAsNames(Dir)) {
      names.add(name);
    }
  }
  for (const candidate of getOutletQueryCandidates(outlet)) {
    for (const name of getExportAsNames(candidate.constructor as Type<any>)) {
      names.add(name);
    }
  }
  return [...names];
}

function normalizePredicates(predicate: unknown): unknown[] {
  if (predicate == null) {
    return [];
  }
  // Angular splits string locators into string[]; multi-type selectors are Type[].
  return Array.isArray(predicate) ? predicate : [predicate];
}

function isTemplateRefType(value: unknown): boolean {
  return value === TemplateRef;
}

function predicatesWantTemplateRef(predicate: unknown): boolean {
  return normalizePredicates(predicate).some(isTemplateRefType);
}

/**
 * Pick the instance a content query should read from one child outlet
 * (component or directive), following Angular selector / exportAs / refName rules.
 */
function pickMatchForOutlet(outlet: ComponentOutlet, predicate: unknown): unknown | undefined {
  const candidates = getOutletQueryCandidates(outlet);
  if (!candidates.length) {
    return undefined;
  }

  const predicates = normalizePredicates(predicate);
  if (!predicates.length) {
    return outlet.componentInstance ?? candidates[0];
  }

  // TemplateRef is never an outlet host instance — handled via projected templates.
  if (predicates.every(isTemplateRefType)) {
    return undefined;
  }

  for (const p of predicates) {
    if (isTemplateRefType(p)) {
      continue;
    }
    if (typeof p === 'string') {
      // props.refName ≈ template `#name` on the host → component instance
      if (outletLocalRefs.get(outlet) === p) {
        return outlet.componentInstance ?? candidates[0];
      }
      // exportAs on component or any host directive
      for (const candidate of candidates) {
        if (getExportAsNames(candidate.constructor as Type<any>).includes(p)) {
          return candidate;
        }
      }
      continue;
    }
    if (typeof p === 'function') {
      const match = candidates.find((candidate) => candidate instanceof (p as Type<unknown>));
      if (match) {
        return match;
      }
    }
  }
  return undefined;
}

function pickMatchForProjectedTemplate(
  entry: ProjectedTemplateEntry,
  predicate: unknown,
): TemplateRef<unknown> | undefined {
  const predicates = normalizePredicates(predicate);
  if (!predicates.length) {
    return undefined;
  }
  for (const p of predicates) {
    if (isTemplateRefType(p)) {
      return entry.templateRef;
    }
    if (typeof p === 'string' && entry.refName === p) {
      return entry.templateRef;
    }
  }
  return undefined;
}

/**
 * Resolve content-query matches for one parent: child outlets + schema NgTemplate TemplateRefs,
 * ordered by schema declaration order (childIndex * STRIDE + loopIndex), not projected DOM order.
 */
export function resolvePatchResults(
  target: ContentQueryPatchTarget,
  childOutlets: ComponentOutlet[],
  parentOutlet?: ComponentOutlet | null,
): unknown[] {
  type Entry =
    | { kind: 'outlet'; outlet: ComponentOutlet }
    | { kind: 'template'; entry: ProjectedTemplateEntry };

  const entries: Entry[] = [
    ...childOutlets.map((outlet) => ({ kind: 'outlet' as const, outlet })),
  ];

  if (parentOutlet) {
    for (const entry of getProjectedTemplates(parentOutlet)) {
      entries.push({ kind: 'template', entry });
    }
  }

  const schemaIndex = (item: Entry): number =>
    item.kind === 'outlet'
      ? (getContentOutletSchemaIndex(item.outlet) ?? Number.MAX_SAFE_INTEGER)
      : (item.entry.index ?? Number.MAX_SAFE_INTEGER);
  entries.sort((a, b) => schemaIndex(a) - schemaIndex(b));

  const results: unknown[] = [];
  for (const item of entries) {
    if (item.kind === 'outlet') {
      const match = pickMatchForOutlet(item.outlet, target.predicate);
      if (match != null) {
        results.push(match);
      }
    } else {
      const match = pickMatchForProjectedTemplate(item.entry, target.predicate);
      if (match != null) {
        results.push(match);
      }
    }
  }

  // TemplateRef-only queries: if schema order was unavailable, still return registrations.
  if (!results.length && parentOutlet && predicatesWantTemplateRef(target.predicate)) {
    for (const entry of getProjectedTemplates(parentOutlet)) {
      const match = pickMatchForProjectedTemplate(entry, target.predicate);
      if (match != null) {
        results.push(match);
      }
    }
  }

  return results;
}

function sameQueryResults(a: unknown[], b: unknown[]): boolean {
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

/** Stable key for schema-driven children (survives QueryList wipe; not instance identity). */
function childrenStructureKey(childInstances: unknown[]): string {
  return childInstances
    .map((child) => (child as object)?.constructor?.name ?? '?')
    .join(',');
}

/** Last structure key that already triggered a view refresh. */
const lastScheduledStructureKey = new WeakMap<ComponentOutlet, string>();

/**
 * Install/update signal shim.
 * Safe to call only outside ApplicationRef.synchronize / checkNoChanges (e.g. post-tick microtask).
 */
function installOrUpdateSignalShim(
  hostInstance: object,
  signalNode: object,
  propertyName: string,
  firstOnly: boolean,
  results: unknown[],
  predicate: unknown = null,
): boolean {
  rememberShimBinding(hostInstance, signalNode, propertyName, firstOnly, predicate);
  const nextValue = firstOnly ? results[0] ?? undefined : results;
  let shim = signalShims.get(signalNode);
  if (!shim) {
    shim = signal(nextValue);
    signalShims.set(signalNode, shim);
    (hostInstance as any)[propertyName] = shim.asReadonly();
    return true;
  }
  const prev = shim();
  if (firstOnly ? prev === nextValue : sameQueryResults((prev as unknown[]) ?? [], results)) {
    return false;
  }
  shim.set(nextValue);
  return true;
}

/** Update all shims previously installed on this host (survives field replace). */
function syncHostSignalShims(
  hostInstance: object,
  childOutlets: ComponentOutlet[],
  parentOutlet: ComponentOutlet,
): boolean {
  const bindings = hostShimBindings.get(hostInstance);
  if (!bindings?.length) {
    return false;
  }
  let changed = false;
  for (const binding of bindings) {
    if (binding.predicate == null) {
      const recovered = getPredicateFromSignalNode(binding.signalNode);
      if (recovered != null) {
        binding.predicate = recovered;
      }
    }
    const results = resolvePatchResults(
      {
        kind: 'signal',
        propertyName: binding.propertyName,
        queryList: null as any,
        predicate: binding.predicate,
      },
      childOutlets,
      parentOutlet,
    );
    if (
      installOrUpdateSignalShim(
        hostInstance,
        binding.signalNode,
        binding.propertyName,
        binding.firstOnly,
        results,
        binding.predicate,
      )
    ) {
      changed = true;
    }
  }
  return changed;
}

/**
 * Patch one content query (QueryList only). Signal shims are synced via {@link syncHostSignalShims}.
 * @returns true if QueryList results changed
 */
export function patchContentQuery(
  target: ContentQueryPatchTarget,
  childOutlets: ComponentOutlet[],
  parentOutlet: ComponentOutlet,
): boolean {
  const results = resolvePatchResults(target, childOutlets, parentOutlet);
  const prev = target.queryList.toArray();
  const changed = !sameQueryResults(prev, results);

  if (changed) {
    // reset() clears dirty so the next CD won't immediately wipe via ɵɵqueryRefresh.
    // Skip notifyOnChanges — subscribers often markForCheck (NG0103 / extra ticks).
    target.queryList.reset(results);
  }

  if (
    target.kind === 'signal' &&
    target.signalNode &&
    target.propertyName &&
    target.hostInstance
  ) {
    rememberShimBinding(
      target.hostInstance,
      target.signalNode,
      target.propertyName,
      !!target.firstOnly,
      target.predicate,
    );
  }

  return changed;
}

/**
 * Patch content queries for one parent outlet.
 * Must run after the CD tick (including checkNoChanges) — not inside afterEveryRender (NG0100).
 * @returns true if queries changed and the view was marked for check
 */
export function patchOutletContentQueries(
  parentOutlet: ComponentOutlet,
  childOutlets: ComponentOutlet[],
): boolean {
  const parentInstance = parentOutlet.componentInstance;
  if (!parentInstance) {
    return false;
  }
  const childInstances = childOutlets
    .map((child) => child.componentInstance)
    .filter((instance): instance is object => instance != null);
  const projected = getProjectedTemplates(parentOutlet);

  const structureKey = `${childInstances.length}:${childrenStructureKey(childInstances)}#tpl:${projected.length}:${projected.map((p) => p.refName ?? '').join(',')}`;
  const targets = discoverContentQueryTargets(parentInstance);
  let queryChanged = false;
  let shimChanged = false;
  for (const target of targets) {
    if (patchContentQuery(target, childOutlets, parentOutlet)) {
      queryChanged = true;
    }
  }
  // After first install, instance fields are plain signals — still update via registry.
  if (syncHostSignalShims(parentInstance, childOutlets, parentOutlet)) {
    shimChanged = true;
  }
  bindDecoratorQueryPropertyNames(parentInstance, targets);
  if (syncHostFieldsFromContentQueryTargets(parentInstance, targets)) {
    queryChanged = true;
  }

  if (!queryChanged && !shimChanged) {
    return false;
  }

  // Re-filling QueryList after a wipe must not schedule another CD (would loop).
  // Only refresh when schema child structure changed or shims need a new value.
  const structureChanged = lastScheduledStructureKey.get(parentOutlet) !== structureKey;
  if (!structureChanged && !shimChanged) {
    return false;
  }
  lastScheduledStructureKey.set(parentOutlet, structureKey);
  parentOutlet.componentRef?.changeDetectorRef.markForCheck();
  return true;
}

/**
 * Map decorator @ContentChild QueryLists (no propertyName yet) to host fields using the
 * compiled `ɵcmp.contentQueries` update assignments (`ctx.firstItem = _t.first`).
 * Only touches properties Angular itself writes — never guesses by field-name regex.
 */
function bindDecoratorQueryPropertyNames(
  instance: object,
  targets: ContentQueryPatchTarget[],
): void {
  const contentQueries = (instance.constructor as any)?.ɵcmp?.contentQueries;
  if (typeof contentQueries !== 'function') {
    return;
  }
  const src = Function.prototype.toString.call(contentQueries);
  // `ctx.foo = _t.first` → @ContentChild
  const firstProps = [...src.matchAll(/ctx\.([A-Za-z_][\w]*)\s*=\s*_t\.first/g)].map(
    (m) => m[1],
  );
  if (!firstProps.length) {
    return;
  }
  // LView order: signals (kind=signal) + ContentChildren (propertyName set, field is QueryList)
  // + @ContentChild QueryLists (still propertyName null). Match the latter to firstProps in order.
  const unboundChildQueries = targets.filter(
    (t) => t.kind === 'query-list' && !t.propertyName,
  );
  for (let i = 0; i < firstProps.length && i < unboundChildQueries.length; i++) {
    unboundChildQueries[i].propertyName = firstProps[i];
    unboundChildQueries[i].firstOnly = true;
  }
}

/**
 * After QueryList.reset, Ivy would do `ctx.prop = queryList.first` when queryRefresh returns
 * true. We clear dirty on reset, so mirror that write only for targets that are known content
 * queries with a resolved propertyName.
 */
function syncHostFieldsFromContentQueryTargets(
  instance: object,
  targets: ContentQueryPatchTarget[],
): boolean {
  let changed = false;
  for (const target of targets) {
    if (target.kind === 'signal' || !target.propertyName) {
      continue;
    }
    const prop = target.propertyName;
    const current = (instance as any)[prop];
    // @ContentChildren: host field IS the QueryList — already updated by reset().
    if (current === target.queryList) {
      continue;
    }
    // @ContentChild: host field holds the single match (or null).
    const next = target.queryList.toArray()[0] ?? null;
    if (current !== next) {
      (instance as any)[prop] = next;
      changed = true;
    }
  }
  return changed;
}
