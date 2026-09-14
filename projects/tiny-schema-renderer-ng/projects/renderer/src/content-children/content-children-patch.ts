import {
  InjectionToken,
  Injector,
  QueryList,
  TemplateRef,
  Type,
  signal,
  ɵgetDirectives,
  ɵgetLContext as getLContext,
} from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';
import { ComponentOutlet } from '../component-outlet';

/**
 * Angular 20 LView header slot for LQueries. This is a private Ivy layout detail, NOT a stable
 * API: it can move between Angular minor versions. It is only a fast path — `findLQueries`
 * always falls back to a structural scan of the LView array (see below), so a moved slot degrades
 * to the scan instead of failing. The renderer is currently built against `@angular/core@^20.3.0`
 * (resolved to 20.3.x); when bumping Angular, re-verify this index against the `LView` layout.
 */
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
 * Directive instances dynamically created on a schema `NgTemplate` via
 * {@link SchemaTemplateDirectivesDirective}. Native `@ContentChild` cannot see them
 * (not in LView slots); the content-children patch reads this map instead.
 */
const templateDirectiveInstances = new WeakMap<TemplateRef<unknown>, object[]>();

/** Register (or clear) schema structural / attribute directive instances for a TemplateRef. */
export function setTemplateDirectiveInstances(
  templateRef: TemplateRef<unknown>,
  instances: object[],
): void {
  if (!instances.length) {
    templateDirectiveInstances.delete(templateRef);
    return;
  }
  templateDirectiveInstances.set(templateRef, instances.slice());
}

/** Snapshot of directive instances currently attached to a schema NgTemplate. */
export function getTemplateDirectiveInstances(
  templateRef: TemplateRef<unknown>,
): object[] {
  return templateDirectiveInstances.get(templateRef)?.slice() ?? [];
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

/**
 * Query-signal node. Fast path uses Angular's `SIGNAL` brand; production bundles can
 * duplicate that symbol, so fall back to any own-symbol whose node holds a QueryList.
 */
function getQuerySignalNode(value: unknown): any | null {
  if (typeof value !== 'function') {
    return null;
  }
  const branded = (value as any)[SIGNAL];
  if (branded?._queryList instanceof QueryList) {
    return branded;
  }
  for (const sym of Object.getOwnPropertySymbols(value)) {
    const node = (value as any)[sym];
    if (node?._queryList instanceof QueryList) {
      return node;
    }
  }
  return null;
}

function isQuerySignal(value: unknown): value is ((...args: any[]) => any) {
  return getQuerySignalNode(value) != null;
}

/** Ivy `ctx.foo` or minified `n.foo` — identifiers minify, property names usually do not. */
const IVY_CTX_PROP = '[A-Za-z_$][\\w$]*\\.([A-Za-z_$][\\w$]*)';
const IVY_ASSIGN_FIRST_RE = new RegExp(
  `${IVY_CTX_PROP}\\s*=\\s*[A-Za-z_$][\\w$]*\\.first\\b`,
  'g',
);
const IVY_ASSIGN_RE = new RegExp(`${IVY_CTX_PROP}\\s*=`, 'g');
const IVY_CALL_PROP_ARG_RE = new RegExp(`\\(\\s*${IVY_CTX_PROP}\\s*,`, 'g');

function ivyCtxProps(src: string, pattern: RegExp): string[] {
  const props: string[] = [];
  pattern.lastIndex = 0;
  for (const m of src.matchAll(pattern)) {
    props.push(m[1]);
  }
  return props;
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
    // decorator @ViewChild/@ViewChildren: `ctx.foo = _t.first` or minified `r.trigger=o.first`
    for (const name of ivyCtxProps(src, IVY_ASSIGN_RE)) {
      names.add(name);
    }
    // signal viewChild(): `ɵɵviewQuerySignal(ctx.foo,` or minified `Og(r._iconPrefixContainerSignal,`
    for (const name of ivyCtxProps(src, IVY_CALL_PROP_ARG_RE)) {
      names.add(name);
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
  const shimBindings = hostShimBindings.get(instance);
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
      const node = getQuerySignalNode(value);
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
    } else if (shimBindings) {
      // Field was replaced by a plain readonly signal during a previous patch —
      // recover its signal identity so bindDecoratorQueryPropertyNames doesn't
      // mis-assign decorator field names to signal-backed QueryLists.
      const binding = shimBindings.find((b) => b.propertyName === key);
      if (!binding) {
        continue;
      }
      const queryList = (binding.signalNode as any)?._queryList as
        | QueryList<unknown>
        | undefined;
      if (!queryList || !seen.has(queryList)) {
        continue;
      }
      const existing = targets.find((t) => t.queryList === queryList);
      if (existing) {
        existing.kind = 'signal';
        existing.propertyName = key;
        existing.signalNode = binding.signalNode;
        existing.firstOnly = binding.firstOnly;
        existing.hostInstance = instance;
        if (existing.predicate == null && binding.predicate != null) {
          existing.predicate = binding.predicate;
        }
      }
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
      // ContentChild(MatFormFieldControl) matches `provide: { useExisting: MatInput }`,
      // not `instanceof`. Native queries walk providers; so must we.
      const provided = resolveProvidedToken(outlet, p as Type<unknown>);
      if (provided != null) {
        return provided;
      }
      continue;
    }
    // ContentChild(MAT_SLIDER_THUMB) etc. — InjectionToken, not a class.
    if (p instanceof InjectionToken) {
      const provided = resolveProvidedToken(outlet, p);
      if (provided != null) {
        return provided;
      }
    }
  }
  return undefined;
}

/** Resolve a class / DI token provided by this outlet's host (component or host directives). */
function resolveProvidedToken(
  outlet: ComponentOutlet,
  token: Type<unknown> | InjectionToken<unknown>,
): unknown {
  const injectors = [outlet.componentRef?.injector, outlet.componentInjector].filter(
    (injector): injector is Injector => injector != null,
  );
  for (const injector of injectors) {
    try {
      const value = injector.get(token as Type<unknown>, null, { optional: true, self: true });
      if (value != null) {
        return value;
      }
    } catch {
      // Host injector may not be ready.
    }
  }
  for (const injector of injectors) {
    try {
      const value = injector.get(token as Type<unknown>, null, { optional: true });
      if (value != null && getOutletQueryCandidates(outlet).includes(value as object)) {
        return value;
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

/**
 * Resolve a type / InjectionToken predicate against directive instances on a schema
 * NgTemplate (instanceof + `providers: [{ provide, useExisting }]` mirrors outlet hosts).
 */
function pickMatchFromTemplateDirectives(
  instances: object[],
  predicate: unknown,
): unknown | undefined {
  if (!instances.length) {
    return undefined;
  }
  if (typeof predicate === 'string') {
    return instances.find((candidate) => typeNameMatches(candidate, predicate));
  }
  if (typeof predicate === 'function') {
    const match = instances.find((candidate) => candidate instanceof (predicate as Type<unknown>));
    if (match) {
      return match;
    }
    // e.g. ContentChildren(CdkColumnDef) when only MatColumnDef is present and provides it.
    for (const candidate of instances) {
      const provided = resolveProvidedTokenFromInstance(candidate, predicate as Type<unknown>);
      if (provided != null) {
        return provided;
      }
    }
    return undefined;
  }
  if (predicate instanceof InjectionToken) {
    for (const candidate of instances) {
      const provided = resolveProvidedTokenFromInstance(candidate, predicate);
      if (provided != null) {
        return provided;
      }
    }
  }
  return undefined;
}

/** Match Ivy `contentQuery(..., CdkCellDef, …)` name strings to live Mat/Cdk instances. */
function typeNameMatches(instance: object, predicateName: string): boolean {
  const want = predicateName.replace(/^_/, '');
  const got = (instance.constructor?.name ?? '').replace(/^_/, '');
  if (!want || !got) {
    return false;
  }
  if (got === want) {
    return true;
  }
  // MatX provides CdkX (MatCellDef ↔ CdkCellDef).
  if (want.startsWith('Cdk') && got === `Mat${want.slice(3)}`) {
    return true;
  }
  if (want.startsWith('Mat') && got === `Cdk${want.slice(3)}`) {
    return true;
  }
  const def = (instance.constructor as Type<any> & { ɵdir?: any; ɵcmp?: any }).ɵdir
    ?? (instance.constructor as Type<any> & { ɵcmp?: any }).ɵcmp;
  const providers = def?.providers;
  if (!Array.isArray(providers)) {
    return false;
  }
  return providers.some(
    (provider: any) =>
      provider
      && typeof provider === 'object'
      && 'provide' in provider
      && 'useExisting' in provider
      && typeof provider.provide?.name === 'string'
      && provider.provide.name.replace(/^_/, '') === want,
  );
}

/** Read `ɵdir.providers` / `ɵcmp.providers` for `useExisting` matching (no injector walk). */
function resolveProvidedTokenFromInstance(
  instance: object,
  token: Type<unknown> | InjectionToken<unknown>,
): unknown {
  const def = (instance.constructor as Type<any> & { ɵdir?: any; ɵcmp?: any }).ɵdir
    ?? (instance.constructor as Type<any> & { ɵcmp?: any }).ɵcmp;
  const providers = def?.providers;
  if (!Array.isArray(providers)) {
    return undefined;
  }
  for (const provider of providers) {
    if (
      provider
      && typeof provider === 'object'
      && 'provide' in provider
      && provider.provide === token
      && 'useExisting' in provider
    ) {
      // useExisting points at the declaring class; the live instance is `instance`.
      return instance;
    }
  }
  return undefined;
}

function pickMatchForTemplateEntry(
  entry: TemplateContentRefEntry,
  predicate: unknown,
): unknown | undefined {
  const predicates = normalizePredicates(predicate);
  if (!predicates.length) {
    return undefined;
  }
  const instances = getTemplateDirectiveInstances(entry.templateRef);
  for (const p of predicates) {
    if (isTemplateRefType(p)) {
      return entry.templateRef;
    }
    if (typeof p === 'string' && entry.refName === p) {
      return entry.templateRef;
    }
    const fromDirs = pickMatchFromTemplateDirectives(instances, p);
    if (fromDirs != null) {
      return fromDirs;
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

  return results;
}

/** Null and undefined are the same empty ContentChild result. */
function sameSlotValue(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  return a == null && b == null;
}

function sameQueryResults(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!sameSlotValue(a[i], b[i])) {
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

/** Last patch fingerprint that already scheduled a view refresh for this outlet. */
const lastScheduledPatchKey = new WeakMap<ComponentOutlet, string>();

let patchIdentitySeq = 0;
const patchIdentities = new WeakMap<object, number>();

function patchIdentity(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value !== 'object') {
    return `p:${String(value)}`;
  }
  let id = patchIdentities.get(value);
  if (id == null) {
    id = ++patchIdentitySeq;
    patchIdentities.set(value, id);
  }
  return String(id);
}

function queryResultsFingerprint(targets: ContentQueryPatchTarget[]): string {
  return targets
    .map((target) => {
      const items = target.queryList?.toArray?.() ?? [];
      return `${target.kind}:${target.propertyName ?? ''}:${items.map(patchIdentity).join(',')}`;
    })
    .join('|');
}

type ReactiveLink = { consumer: ReactiveNode; nextConsumer?: ReactiveLink };
type ReactiveNode = {
  value?: unknown;
  version?: number;
  dirty?: boolean;
  consumers?: ReactiveLink;
  consumerMarkedDirty?: (node: ReactiveNode) => void;
};

/**
 * Derived computeds such as MatFormField `_hasFloatingLabel = computed(() => !!this._labelChild())`
 * subscribe to the original `contentChild()` computed. Replacing the field with a shim does not
 * change that computed's value (native query is still empty), so they never re-run and lazy
 * `@if (_hasFloatingLabel())` ng-content stays uncreated. Publish the patched value onto the
 * original node and notify its consumers so they re-read `this._labelChild`.
 */
function publishQuerySignalValue(signalNode: object, nextValue: unknown): void {
  const node = signalNode as ReactiveNode;
  node.value = nextValue;
  node.version = (node.version ?? 0) + 1;
  markReactiveConsumersDirty(node);
}

function markReactiveConsumersDirty(node: ReactiveNode): void {
  for (let link = node.consumers; link; link = link.nextConsumer) {
    const consumer = link.consumer;
    if (!consumer || consumer.dirty) {
      continue;
    }
    consumer.dirty = true;
    consumer.consumerMarkedDirty?.(consumer);
    markReactiveConsumersDirty(consumer);
  }
}

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
    publishQuerySignalValue(signalNode, nextValue);
    return true;
  }
  const prev = shim();
  if (firstOnly ? sameSlotValue(prev, nextValue) : sameQueryResults((prev as unknown[]) ?? [], results)) {
    return false;
  }
  shim.set(nextValue);
  publishQuerySignalValue(signalNode, nextValue);
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
    target.queryList.notifyOnChanges();
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
 * Collect content queries along the directive inheritance chain (e.g. MatColumnDef → CdkColumnDef).
 *
 * After Ivy linking, `ɵdir.queries` is often stripped and only `contentQueries(rf, ctx)` remains
 * (see CdkColumnDef). Parse that function for predicates + `ctx.prop = _t.first` assignments.
 */
function collectDirectiveQueryDefs(ctor: Type<unknown>): Array<{
  propertyName: string;
  predicate: unknown;
  firstOnly: boolean;
  descendants: boolean;
}> {
  const results: Array<{
    propertyName: string;
    predicate: unknown;
    firstOnly: boolean;
    descendants: boolean;
  }> = [];
  const seen = new Set<string>();
  let current: Type<unknown> | null | undefined = ctor;
  let depth = 0;
  while (current && depth < 8) {
    const dir = (current as Type<unknown> & { ɵdir?: { queries?: any[]; contentQueries?: Function } })
      .ɵdir;
    if (Array.isArray(dir?.queries)) {
      for (const q of dir!.queries!) {
        const propertyName = typeof q?.propertyName === 'string' ? q.propertyName : null;
        if (!propertyName || seen.has(propertyName)) {
          continue;
        }
        seen.add(propertyName);
        results.push({
          propertyName,
          predicate: q.predicate ?? null,
          firstOnly: !!q.first,
          descendants: !!q.descendants,
        });
      }
    } else if (typeof dir?.contentQueries === 'function') {
      for (const q of parseDirectiveContentQueries(dir.contentQueries)) {
        if (seen.has(q.propertyName)) {
          continue;
        }
        seen.add(q.propertyName);
        results.push(q);
      }
    }
    const proto = Object.getPrototypeOf(current.prototype);
    const nextCtor = proto?.constructor as Type<unknown> | undefined;
    if (!nextCtor || nextCtor === Object || nextCtor === current) {
      break;
    }
    current = nextCtor;
    depth++;
  }
  return results;
}

/**
 * Recover `@ContentChild` metadata from a linked `ɵdir.contentQueries` function.
 * Predicate is the identifier name string (e.g. `"CdkCellDef"`) — {@link pickMatchFromTemplateDirectives}
 * resolves it against live directive instances by constructor / provide name.
 */
function parseDirectiveContentQueries(contentQueries: Function): Array<{
  propertyName: string;
  predicate: unknown;
  firstOnly: boolean;
  descendants: boolean;
}> {
  const src = Function.prototype.toString.call(contentQueries);
  const predicates: Array<{ name: string; flags: number }> = [];
  const predRe =
    /contentQuery\s*\(\s*[^,]+,\s*([A-Za-z_$][\w$]*)\s*,\s*(\d+)\s*\)/g;
  for (const m of src.matchAll(predRe)) {
    predicates.push({ name: m[1], flags: Number(m[2]) || 0 });
  }
  const firstProps = ivyCtxProps(src, IVY_ASSIGN_FIRST_RE);
  const assignProps = ivyCtxProps(src, IVY_ASSIGN_RE);
  const props = firstProps.length ? firstProps : assignProps;
  const firstSet = new Set(firstProps);
  const out: Array<{
    propertyName: string;
    predicate: unknown;
    firstOnly: boolean;
    descendants: boolean;
  }> = [];
  for (let i = 0; i < props.length && i < predicates.length; i++) {
    out.push({
      propertyName: props[i],
      predicate: predicates[i].name,
      firstOnly: firstSet.has(props[i]) || firstProps.length > 0,
      descendants: !!(predicates[i].flags & QUERY_FLAG_DESCENDANTS),
    });
  }
  return out;
}

/**
 * Patch `@ContentChild(ren)` declared on host directives (e.g. MatColumnDef.cell on
 * `ng-container` + matColumnDef). Component-instance queries are handled separately via
 * {@link discoverContentQueryTargets}; host-directive queries often have no live QueryList
 * on the component instance, so we write matched results straight onto the directive fields.
 */
function patchHostDirectiveContentQueries(
  parentOutlet: ComponentOutlet,
  descendantOutlets?: ComponentOutlet[] | null,
): boolean {
  let changed = false;
  for (const candidate of getOutletQueryCandidates(parentOutlet)) {
    if (candidate === parentOutlet.componentInstance) {
      continue;
    }
    const queryDefs = collectDirectiveQueryDefs(candidate.constructor as Type<unknown>);
    if (!queryDefs.length) {
      continue;
    }
    for (const q of queryDefs) {
      const results = resolvePatchResults(
        {
          kind: 'query-list',
          propertyName: q.propertyName,
          // Unused when resolving via resolvePatchResults — only predicate/descendants matter.
          queryList: null as unknown as QueryList<unknown>,
          predicate: q.predicate,
          firstOnly: q.firstOnly,
          descendants: q.descendants,
          hostInstance: candidate,
        },
        parentOutlet,
        descendantOutlets,
      );
      const next = q.firstOnly ? (results[0] ?? null) : results;
      const current = (candidate as Record<string, unknown>)[q.propertyName];
      if (q.firstOnly) {
        if (!sameSlotValue(current, next)) {
          (candidate as Record<string, unknown>)[q.propertyName] = next;
          changed = true;
        }
      } else if (!sameQueryResults(Array.isArray(current) ? current : [], results)) {
        (candidate as Record<string, unknown>)[q.propertyName] = results;
        changed = true;
      }
    }
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

  const structureKey = `${childInstances.length}:${childrenStructureKey(childInstances)}#tpl:${projected.length}:${projected
    .map((p) => {
      const dirs = getTemplateDirectiveInstances(p.templateRef);
      return `${p.refName ?? ''}:${dirs.map((d) => d.constructor.name).join(',')}`;
    })
    .join('|')}`;
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
  if (patchHostDirectiveContentQueries(parentOutlet, descendantOutlets)) {
    queryChanged = true;
  }

  if (!queryChanged && !shimChanged) {
    return false;
  }

  // Query-result changes (e.g. MatFormFieldControl resolved via provide) need a CD so
  // `_shouldLabelFloat` / `_initializeControl` see the real control. Structure-only
  // gating would skip that when children were already registered.
  // Fingerprint the applied results: MatTab empty ContentChild was `undefined !== null`
  // every tick, which markForCheck'd in a loop (NG0103). Same results → no extra CD.
  // Include host-directive ContentChild fields (MatColumnDef.cell etc.) so wiring them
  // after component QueryLists still schedules a CD.
  const hostDirKey = getOutletQueryCandidates(parentOutlet)
    .filter((c) => c !== parentInstance)
    .map((c) =>
      collectDirectiveQueryDefs(c.constructor as Type<unknown>)
        .map((q) => {
          const v = (c as Record<string, unknown>)[q.propertyName];
          const label =
            v == null
              ? ''
              : Array.isArray(v)
                ? v.map((x) => (x as object)?.constructor?.name ?? String(x)).join(',')
                : ((v as object)?.constructor?.name ?? String(v));
          return `${q.propertyName}:${label}`;
        })
        .join(','),
    )
    .join('|');
  const patchKey = `${structureKey}#${queryResultsFingerprint(targets)}#hd:${hostDirKey}`;
  if (lastScheduledPatchKey.get(parentOutlet) === patchKey) {
    return false;
  }
  lastScheduledPatchKey.set(parentOutlet, patchKey);
  parentOutlet.componentRef?.changeDetectorRef.markForCheck();
  return true;
}

/**
 * Compiled `ɵcmp.contentQueries` source is re-parsed per class to recover `@ContentChild` field
 * names. Ivy emits `ctx.foo = _t.first`; production minify rewrites locals (`r._formFieldControl=a.first`)
 * but keeps the property name. That name is not in query metadata, so toString is the only source.
 * Fail closed: when nothing matches, field-name binding is skipped. Cached per class.
 */
const contentChildFirstPropsByClass = new WeakMap<object, string[]>();

function getContentChildFirstProps(instance: object): string[] {
  const ctor = instance.constructor as object;
  const cached = contentChildFirstPropsByClass.get(ctor);
  if (cached) {
    return cached;
  }
  const firstProps: string[] = [];
  const contentQueries = (ctor as any)?.ɵcmp?.contentQueries;
  if (typeof contentQueries === 'function') {
    const src = Function.prototype.toString.call(contentQueries);
    firstProps.push(...ivyCtxProps(src, IVY_ASSIGN_FIRST_RE));
  }
  contentChildFirstPropsByClass.set(ctor, firstProps);
  return firstProps;
}

/**
 * Map decorator @ContentChild QueryLists (propertyName still null) to host fields using the
 * compiled `ɵcmp.contentQueries` update assignments (`ctx.firstItem = _t.first`).
 */
function bindDecoratorQueryPropertyNames(
  instance: object,
  targets: ContentQueryPatchTarget[],
): void {
  const firstProps = getContentChildFirstProps(instance);
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
    if (!sameSlotValue(current, next)) {
      (instance as any)[prop] = next;
      changed = true;
    }
  }
  return changed;
}
