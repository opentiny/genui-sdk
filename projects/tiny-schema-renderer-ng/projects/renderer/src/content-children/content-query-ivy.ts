import { QueryList, ɵgetLContext as getLContext } from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';
import { ContentQueryPatchTarget } from './content-query-types';

/**
 * Angular 20 LView header slot for LQueries. This is a private Ivy layout detail, NOT a stable
 * API: it can move between Angular minor versions. It is only a fast path — `findLQueries`
 * always falls back to a structural scan of the LView array (see below), so a moved slot degrades
 * to the scan instead of failing. The renderer is currently built against `@angular/core@^20.3.0`
 * (resolved to 20.3.x); when bumping Angular, re-verify this index against the `LView` layout.
 */
const LVIEW_QUERIES_INDEX = 18;

/** Angular `QueryFlags.descendants` (bit 0) — `contentChild(..., { descendants: true })`. */
export const QUERY_FLAG_DESCENDANTS = 1;

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

/** Bindings recorded after a content-query signal field is replaced by a shim. */
export function getHostShimBindings(host: object) {
  return hostShimBindings.get(host);
}

export function rememberShimBinding(
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
export const IVY_ASSIGN_FIRST_RE = new RegExp(
  `${IVY_CTX_PROP}\\s*=\\s*[A-Za-z_$][\\w$]*\\.first\\b`,
  'g',
);
export const IVY_ASSIGN_RE = new RegExp(`${IVY_CTX_PROP}\\s*=`, 'g');
const IVY_CALL_PROP_ARG_RE = new RegExp(`\\(\\s*${IVY_CTX_PROP}\\s*,`, 'g');

export function ivyCtxProps(src: string, pattern: RegExp): string[] {
  const props: string[] = [];
  pattern.lastIndex = 0;
  for (const m of src.matchAll(pattern)) {
    props.push(m[1]);
  }
  return props;
}

/** Read predicate from a bound query signal node (no signal read → no QueryList wipe). */
export function getPredicateFromSignalNode(node: any): unknown {
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

export function getTQueries(lView: any): { queries?: Array<{ metadata?: { predicate?: unknown; flags?: number }; _declarationNodeIndex?: number }> } | null {
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
export function isContentQueryIndex(lView: any, queryIndex: number): boolean {
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
 * Property names declared by compiled `viewQuery` fns — @ViewChild/@ViewChildren updates
 * (`ctx.foo = _t`) and viewChild()/viewChildren() signals (`ɵɵviewQuerySignal(ctx.foo, ...)`).
 * Content patching must skip these: wiping e.g. TiDateComponent.dateEditComs breaks `focus()`.
 *
 * Production bundles minify locals (`e.dateEditComs=t`) and instruction names
 * (`Og(r._iconPrefixContainerSignal,`); property names usually survive. Inherited queries
 * (TiDate ← TiDateBase) may live on the parent `ɵcmp.viewQuery` only — walk the prototype
 * chain. Content-query signals live in `contentQueries`, never here, so they stay patchable.
 *
 * Note: runtime `ɵcmp` does not expose a `viewQueries` array — only the compiled `viewQuery`
 * function is available, so property names are recovered by parsing that function source.
 */
const viewQueryPropsByClass = new WeakMap<object, Set<string>>();

function collectViewQueryPropertyNamesFromCtor(ctor: object, names: Set<string>): void {
  const viewQuery = (ctor as any)?.ɵcmp?.viewQuery;
  if (typeof viewQuery !== 'function') {
    return;
  }
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

function getViewQueryPropertyNames(instance: object): Set<string> {
  const ctor = instance.constructor as object;
  let names = viewQueryPropsByClass.get(ctor);
  if (names) {
    return names;
  }
  names = new Set<string>();
  let current: object | null = ctor;
  while (current && current !== Object && current !== Function && current !== Object.prototype) {
    collectViewQueryPropertyNamesFromCtor(current, names);
    current = Object.getPrototypeOf(current);
  }
  viewQueryPropsByClass.set(ctor, names);
  return names;
}

/**
 * Property names declared by compiled `contentQueries` fns (`ctx._allDrawers = _t`).
 * Instance QueryLists that are NOT listed here are internal (e.g. MatDrawerContainer._drawers)
 * and must not be content-patched — Material then calls `drawer._animationStarted.pipe`.
 */
const contentQueryPropsByClass = new WeakMap<object, Set<string>>();

function collectContentQueryPropertyNamesFromCtor(ctor: object, names: Set<string>): void {
  const contentQueries =
    (ctor as any)?.ɵcmp?.contentQueries ?? (ctor as any)?.ɵdir?.contentQueries;
  if (typeof contentQueries !== 'function') {
    return;
  }
  const src = Function.prototype.toString.call(contentQueries);
  for (const name of ivyCtxProps(src, IVY_ASSIGN_RE)) {
    names.add(name);
  }
  for (const name of ivyCtxProps(src, IVY_ASSIGN_FIRST_RE)) {
    names.add(name);
  }
  for (const name of ivyCtxProps(src, IVY_CALL_PROP_ARG_RE)) {
    names.add(name);
  }
}

function getContentQueryPropertyNames(instance: object): Set<string> {
  const ctor = instance.constructor as object;
  let names = contentQueryPropsByClass.get(ctor);
  if (names) {
    return names;
  }
  names = new Set<string>();
  let current: object | null = ctor;
  while (current && current !== Object && current !== Function && current !== Object.prototype) {
    collectContentQueryPropertyNamesFromCtor(current, names);
    current = Object.getPrototypeOf(current);
  }
  contentQueryPropsByClass.set(ctor, names);
  return names;
}

/** QueryLists Ivy already classified as view queries — never content-patch these. */
function collectViewQueryLists(instance: object): Set<QueryList<unknown>> {
  const viewLists = new Set<QueryList<unknown>>();
  try {
    const ctx = getLContext(instance);
    const lView = ctx?.lView;
    const lQueries = lView ? findLQueries(lView) : null;
    if (!lView || !lQueries) {
      return viewLists;
    }
    lQueries.queries.forEach((lQuery, index) => {
      if (!isContentQueryIndex(lView, index) && lQuery.queryList instanceof QueryList) {
        viewLists.add(lQuery.queryList);
      }
    });
  } catch {
    // getLContext can throw if instance is not in a live view yet.
  }
  return viewLists;
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
  const viewQueryLists = collectViewQueryLists(instance);
  const contentQueryProps = getContentQueryPropertyNames(instance);
  const shimBindings = hostShimBindings.get(instance);
  for (const key of Object.keys(instance as object)) {
    const value = (instance as any)[key];
    if (value instanceof QueryList) {
      // @ViewChildren fields are resolved by Angular — patching wipes matches (e.g. TiDate.dateEditComs).
      // Only skip when viewQuery source or LQueries classification identifies the list —
      // never infer from length alone (a filled content query would then be skipped forever).
      if (viewQueryProps.has(key) || viewQueryLists.has(value)) {
        continue;
      }
      // Manual QueryLists (MatDrawerContainer._drawers) are filled from another ContentChildren
      // list. Patching them with every descendant makes `_watchDrawerToggle` see non-drawers.
      if (contentQueryProps.size > 0 && !contentQueryProps.has(key) && !seen.has(value)) {
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
      const queryList = node._queryList as QueryList<unknown>;
      if (viewQueryProps.has(key) || viewQueryLists.has(queryList)) {
        continue;
      }
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
