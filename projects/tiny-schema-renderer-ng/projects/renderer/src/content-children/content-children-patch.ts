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

/** Angular `QueryFlags.descendants` (bit 0) — `contentChild(..., { descendants: true })`. */
const QUERY_FLAG_DESCENDANTS = 1;

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
  /** true when the query declares `{ descendants: true }` — match nested content too. */
  descendants?: boolean;
  /** Host component instance — needed to install signal shims. */
  hostInstance?: object;
}

/** Shim signals replacing material contentChild(ren)() fields (LView rematerialize would wipe QueryList-only patches). */
const signalShims = new WeakMap<object, ReturnType<typeof signal<any>>>();

/** Persist shim bindings per host — after field replace, discovery no longer sees query signals. */
const hostShimBindings = new WeakMap<
  object,
  Array<{
    signalNode: object;
    propertyName: string;
    firstOnly: boolean;
    predicate: unknown;
    descendants: boolean;
  }>
>();

/** Ref entry for a schema component child — value resolved lazily via {@link pickMatchForOutlet}. */
export interface OutletContentRefEntry {
  kind: 'outlet';
  /** Schema `props.refName` (template-local name) or null when unnamed. */
  refName: string | null;
  /** Schema declaration order key (`childIndex * {@link SCHEMA_INDEX_STRIDE} + loopIndex`). */
  index?: number;
  /** The child component outlet. */
  outlet: ComponentOutlet;
}

/** Ref entry for a schema NgTemplate child — the value is the TemplateRef itself. */
export interface TemplateContentRefEntry {
  kind: 'template';
  /** Schema `props.refName` (template-local name) or null when unnamed. */
  refName: string | null;
  /** Schema declaration order key (`childIndex * {@link SCHEMA_INDEX_STRIDE} + loopIndex`). */
  index?: number;
  /** The projected TemplateRef. */
  templateRef: TemplateRef<unknown>;
}

/**
 * One ref entry under a parent outlet — unified source for content queries.
 * `refName` mirrors Angular `#name` for string selectors; `props.ref` is not stored here.
 */
export type ContentRefEntry = OutletContentRefEntry | TemplateContentRefEntry;

/** Multiplier for the child-index part of a schema order key (`childIndex * STRIDE + loopIndex`). */
export const SCHEMA_INDEX_STRIDE = 10000;

/** Schema declaration order key per outlet (see {@link ContentChildrenTrackDirective}). */
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

/** Unified per-parent registry: parent outlet → ordered ref entries (outlet + template). */
const contentRefsByParent = new WeakMap<ComponentOutlet, ContentRefEntry[]>();

/** Convenience index: outlet → its registered refName, keeping `getContentOutletQueryNames` O(1). */
const outletLocalRefs = new WeakMap<ComponentOutlet, string>();

function getRefEntryKey(entry: ContentRefEntry): ComponentOutlet | TemplateRef<unknown> | undefined {
  return entry.kind === 'outlet' ? entry.outlet : entry.templateRef;
}

/** Register (or update) one ref entry under `parentOutlet` (component child or NgTemplate). */
export function registerContentRef(parentOutlet: ComponentOutlet, entry: ContentRefEntry): void {
  let list = contentRefsByParent.get(parentOutlet);
  if (!list) {
    list = [];
    contentRefsByParent.set(parentOutlet, list);
  }
  const key = getRefEntryKey(entry);
  const existing = key ? list.find((e) => getRefEntryKey(e) === key) : undefined;
  const name = typeof entry.refName === 'string' && entry.refName.trim() ? entry.refName.trim() : null;
  if (existing) {
    existing.refName = name;
    if (typeof entry.index === 'number') {
      existing.index = entry.index;
    }
  } else {
    list.push({ ...entry, refName: name });
  }
  if (entry.kind === 'outlet') {
    if (name) {
      outletLocalRefs.set(entry.outlet, name);
    } else {
      outletLocalRefs.delete(entry.outlet);
    }
  }
}

/** Remove a registered ref entry (by outlet or templateRef). */
export function unregisterContentRef(parentOutlet: ComponentOutlet, entry: ContentRefEntry): void {
  const list = contentRefsByParent.get(parentOutlet);
  if (!list?.length) {
    return;
  }
  const key = getRefEntryKey(entry);
  const index = key ? list.findIndex((e) => getRefEntryKey(e) === key) : -1;
  if (index >= 0) {
    const [removed] = list.splice(index, 1);
    if (removed.kind === 'outlet') {
      outletLocalRefs.delete(removed.outlet);
    }
  }
}

/** Snapshot of all ref entries (component children + NgTemplates) under `parentOutlet`. */
export function getContentRefs(parentOutlet: ComponentOutlet): ContentRefEntry[] {
  return contentRefsByParent.get(parentOutlet)?.slice() ?? [];
}

/** Schema componentName for the NgTemplate bypass (not a material). */
export const NG_TEMPLATE_SCHEMA_NAME = 'NgTemplate';

export function getContentOutletLocalRef(outlet: ComponentOutlet): string | null {
  return outletLocalRefs.get(outlet) ?? null;
}

function rememberShimBinding(
  host: object,
  signalNode: object,
  propertyName: string,
  firstOnly: boolean,
  predicate: unknown,
  descendants: boolean,
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
    existing.descendants = descendants;
    return;
  }
  list.push({ signalNode, propertyName, firstOnly, predicate, descendants });
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
  return getSignalQueryMetadata(node)?.predicate ?? null;
}

/** Read `{ predicate, flags }` from a bound query signal node, best-effort. */
function getSignalQueryMetadata(
  node: any,
): { predicate: unknown; flags: number } | null {
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
    const tQuery =
      typeof queries.getByIndex === 'function'
        ? queries.getByIndex(queryIndex)
        : queries.queries?.[queryIndex];
    return tQuery?.metadata
      ? { predicate: tQuery.metadata.predicate ?? null, flags: tQuery.metadata.flags ?? 0 }
      : null;
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

function getTQueries(lView: any): { queries?: Array<{ metadata?: { predicate?: unknown; flags?: number }; _declarationNodeIndex?: number }> } | null {
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
 * View queries use `declarationNodeIndex -1`; content queries use the host tNode index.
 * Patching ViewChild QueryLists (e.g. TiTabs #slider) wipes them and breaks layout.
 */
function isContentQueryIndex(lView: any, queryIndex: number): boolean {
  const tView = lView?.[1];
  // tView.queries is indexed like LQueries.queries — prefer its declarationNodeIndex:
  // content queries are created on the host tNode (index >= HEADER_OFFSET), view queries
  // use -1. This handles components declaring several content queries (e.g. DataTable).
  const tQueries = getTQueries(lView);
  const tQuery =
    typeof tView?.queries?.getByIndex === 'function'
      ? tView.queries.getByIndex(queryIndex)
      : tQueries?.queries?.[queryIndex];
  if (tQuery != null && '_declarationNodeIndex' in tQuery) {
    // View query: createTQuery(..., -1)
    return tQuery._declarationNodeIndex !== -1;
  }
  // Fallback: tView.contentQueries lists [queryStartIdx, directiveIdx, ...] pairs —
  // treat any queryIndex >= a listed start as content if no other signal is available.
  const contentQueries = tView?.contentQueries;
  if (Array.isArray(contentQueries) && contentQueries.length) {
    for (let i = 0; i < contentQueries.length; i += 2) {
      if (contentQueries[i] === queryIndex) {
        return true;
      }
    }
  }
  return false;
}

/** Infer contentChild vs contentChildren without reading the signal (reading resets its QueryList). */
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
 * Property names declared by the compiled `viewQuery` fn — @ViewChild/@ViewChildren updates
 * (`ctx.foo = _t`) and viewChild()/viewChildren() signals (`ɵɵviewQuerySignal(ctx.foo, ...)`).
 * Content patching must skip these: wiping e.g. TiDateComponent.dateEditComs breaks `focus()`.
 * Content-query signals live in the contentQueries fn, never here, so they stay patchable.
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

/** Discover content-query QueryLists on a component; skips view queries. */
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
          const tQuery = tQueries?.queries?.[index];
          const predicate = tQuery?.metadata?.predicate ?? null;
          targets.push({
            kind: 'query-list',
            propertyName: null,
            queryList,
            predicate,
            descendants: !!((tQuery?.metadata?.flags ?? 0) & QUERY_FLAG_DESCENDANTS),
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
      // @ViewChildren fields are resolved by Angular — patching wipes matches (e.g. TiDate.dateEditComs).
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
        // @ContentChild still uses QueryList; treat short-name fields as firstOnly.
        firstOnly: /^(first|header|item|child|contentTemplate)/i.test(key) && !/s$/i.test(key),
        hostInstance: instance,
      });
    } else if (isQuerySignal(value)) {
      const node = (value as any)[SIGNAL];
      // viewChild()/viewChildren() signals are resolved by Angular — never patch.
      // Content signals stay patchable.
      if (viewQueryProps.has(key)) {
        continue;
      }
      const queryList = node._queryList as QueryList<unknown>;
      const firstOnly = inferFirstOnly(key);
      const signalMeta = getSignalQueryMetadata(node);
      if (seen.has(queryList)) {
        const existing = targets.find((t) => t.queryList === queryList);
        if (existing) {
          existing.kind = 'signal';
          existing.propertyName = key;
          existing.signalNode = node;
          existing.firstOnly = firstOnly;
          existing.hostInstance = instance;
          if (existing.predicate == null && signalMeta?.predicate != null) {
            existing.predicate = signalMeta.predicate;
          }
        }
        continue;
      }
      seen.add(queryList);
      targets.push({
        kind: 'signal',
        propertyName: key,
        queryList,
        predicate: signalMeta?.predicate ?? null,
        signalNode: node,
        firstOnly,
        descendants: !!((signalMeta?.flags ?? 0) & QUERY_FLAG_DESCENDANTS),
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

/** Component + host directives on an outlet (content queries can target either). */
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

/** Pick the match for one child outlet per Angular selector / exportAs / refName rules. */
function pickMatchForOutlet(
  outlet: ComponentOutlet,
  predicate: unknown,
  refName: string | null,
): unknown | undefined {
  const candidates = getOutletQueryCandidates(outlet);
  if (!candidates.length) {
    return undefined;
  }

  const predicates = normalizePredicates(predicate);
  if (!predicates.length) {
    return outlet.componentInstance ?? candidates[0];
  }

  // TemplateRef is never an outlet host instance — handled via template entries.
  if (predicates.every(isTemplateRefType)) {
    return undefined;
  }

  for (const p of predicates) {
    if (isTemplateRefType(p)) {
      continue;
    }
    if (typeof p === 'string') {
      // props.refName ≈ template `#name` on the host → component instance
      if (refName === p) {
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

function pickMatchForTemplateEntry(
  entry: TemplateContentRefEntry,
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
 * All ref entries for one parent: its direct children, or — when the query declares
 * `{ descendants: true }` — the direct children of every descendant outlet too
 * (`descendantOutlets` provided by ContentChildrenService, pre-sorted in schema order).
 */
function collectRefsForTarget(
  parentOutlet: ComponentOutlet | null | undefined,
  target: ContentQueryPatchTarget,
  descendantOutlets?: ComponentOutlet[] | null,
): ContentRefEntry[] {
  if (!parentOutlet) {
    return [];
  }
  const refs = getContentRefs(parentOutlet);
  if (!target.descendants) {
    return refs;
  }
  for (const outlet of descendantOutlets ?? []) {
    refs.push(...getContentRefs(outlet));
  }
  return refs;
}

/** Resolve query matches for one parent from the ref registry, in schema declaration order. */
export function resolvePatchResults(
  target: ContentQueryPatchTarget,
  parentOutlet?: ComponentOutlet | null,
  descendantOutlets?: ComponentOutlet[] | null,
): unknown[] {
  const entries = collectRefsForTarget(parentOutlet, target, descendantOutlets);

  entries.sort(
    (a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER),
  );

  const results: unknown[] = [];
  for (const item of entries) {
    if (item.kind === 'outlet') {
      const match = pickMatchForOutlet(item.outlet, target.predicate, item.refName);
      if (match != null) {
        results.push(match);
      }
    } else {
      const match = pickMatchForTemplateEntry(item, target.predicate);
      if (match != null) {
        results.push(match);
      }
    }
  }

  // TemplateRef-only queries: fall back to all template entries when nothing matched by name.
  if (!results.length && parentOutlet && predicatesWantTemplateRef(target.predicate)) {
    for (const entry of entries) {
      if (entry.kind !== 'template') {
        continue;
      }
      const match = pickMatchForTemplateEntry(entry, target.predicate);
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

/** Install/update signal shim. Safe only outside ApplicationRef.synchronize (post-tick microtask). */
function installOrUpdateSignalShim(
  hostInstance: object,
  signalNode: object,
  propertyName: string,
  firstOnly: boolean,
  results: unknown[],
  predicate: unknown = null,
  descendants = false,
): boolean {
  rememberShimBinding(hostInstance, signalNode, propertyName, firstOnly, predicate, descendants);
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
  parentOutlet: ComponentOutlet,
  descendantOutlets?: ComponentOutlet[] | null,
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
        descendants: binding.descendants,
      },
      parentOutlet,
      descendantOutlets,
    );
    if (
      installOrUpdateSignalShim(
        hostInstance,
        binding.signalNode,
        binding.propertyName,
        binding.firstOnly,
        results,
        binding.predicate,
        binding.descendants,
      )
    ) {
      changed = true;
    }
  }
  return changed;
}

/** Patch one content query (QueryList only; signal shims synced via {@link syncHostSignalShims}). */
export function patchContentQuery(
  target: ContentQueryPatchTarget,
  parentOutlet: ComponentOutlet,
  descendantOutlets?: ComponentOutlet[] | null,
): boolean {
  const results = resolvePatchResults(target, parentOutlet, descendantOutlets);
  const prev = target.queryList.toArray();
  const changed = !sameQueryResults(prev, results);

  if (changed) {
    // reset() clears dirty so the next CD won't re-wipe via ɵɵqueryRefresh.
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
      !!target.descendants,
    );
  }

  return changed;
}

/**
 * Patch content queries for one parent outlet. Must run after the CD tick
 * (not inside afterEveryRender — would throw NG0100).
 */
export function patchOutletContentQueries(
  parentOutlet: ComponentOutlet,
  descendantOutlets?: ComponentOutlet[] | null,
): boolean {
  const parentInstance = parentOutlet.componentInstance;
  if (!parentInstance) {
    return false;
  }
  const refs = getContentRefs(parentOutlet);
  const childInstances = refs
    .filter((entry): entry is OutletContentRefEntry => entry.kind === 'outlet')
    .map((entry) => entry.outlet.componentInstance)
    .filter((instance): instance is object => instance != null);
  const projected = refs.filter((entry) => entry.kind === 'template');

  const structureKey = `${childInstances.length}:${childrenStructureKey(childInstances)}#tpl:${projected.length}:${projected.map((p) => p.refName ?? '').join(',')}`;
  const targets = discoverContentQueryTargets(parentInstance);
  let queryChanged = false;
  let shimChanged = false;
  for (const target of targets) {
    if (patchContentQuery(target, parentOutlet, descendantOutlets)) {
      queryChanged = true;
    }
  }
  // After first install, instance fields are plain signals — still update via registry.
  if (syncHostSignalShims(parentInstance, parentOutlet, descendantOutlets)) {
    shimChanged = true;
  }
  bindDecoratorQueryPropertyNames(parentInstance, targets);
  if (syncHostFieldsFromContentQueryTargets(parentInstance, targets)) {
    queryChanged = true;
  }

  if (!queryChanged && !shimChanged) {
    return false;
  }

  // Only mark for check when the child structure changed or a shim needs a new value — else we'd loop.
  const structureChanged = lastScheduledStructureKey.get(parentOutlet) !== structureKey;
  if (!structureChanged && !shimChanged) {
    return false;
  }
  lastScheduledStructureKey.set(parentOutlet, structureKey);
  parentOutlet.componentRef?.changeDetectorRef.markForCheck();
  return true;
}

/**
 * Map decorator @ContentChild QueryLists (propertyName still null) to host fields using the
 * compiled `ɵcmp.contentQueries` update assignments (`ctx.firstItem = _t.first`).
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
  // LView order: content signals + ContentChildren (named) + @ContentChild QueryLists (unnamed).
  // Match the unnamed QueryLists to the compiled `_t.first` props in order.
  const unboundChildQueries = targets.filter(
    (t) => t.kind === 'query-list' && !t.propertyName,
  );
  for (let i = 0; i < firstProps.length && i < unboundChildQueries.length; i++) {
    unboundChildQueries[i].propertyName = firstProps[i];
    unboundChildQueries[i].firstOnly = true;
  }
}

/**
 * QueryList.reset clears dirty, so Ivy's `ctx.prop = queryList.first` refresh never runs;
 * mirror that write for known content queries with a resolved propertyName.
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
