import {
  InjectionToken,
  QueryList,
  Type,
  ɵgetDirectives,
  ɵgetLContext as getLContext,
} from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { ContentQueryPatchTarget, OutletContentRefEntry } from './content-query-types';
import { getContentRefs, getTemplateDirectiveInstances } from './content-ref-registry';
import {
  IVY_ASSIGN_FIRST_RE,
  IVY_ASSIGN_RE,
  QUERY_FLAG_DESCENDANTS,
  discoverContentQueryTargets,
  getTQueries,
  isContentQueryIndex,
  ivyCtxProps,
} from './content-query-ivy';
import { getOutletQueryCandidates, resolvePatchResults } from './content-query-match';
import {
  patchContentQuery,
  resetQueryListIfChanged,
  sameSlotValue,
  syncHostSignalShims,
} from './content-query-signals';

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

/** Identity for host-directive query field values (QueryList / array / scalar). */
function hostDirFieldIdentity(value: unknown): string {
  if (value == null) {
    return '';
  }
  const items = Array.isArray(value)
    ? value
    : typeof (value as { toArray?: () => unknown[] }).toArray === 'function'
      ? (value as { toArray: () => unknown[] }).toArray()
      : [value];
  return items.map(patchIdentity).join(',');
}

function queryResultsFingerprint(targets: ContentQueryPatchTarget[]): string {
  return targets
    .map((target) => {
      const items = target.queryList?.toArray?.() ?? [];
      return `${target.kind}:${target.propertyName ?? ''}:${items.map(patchIdentity).join(',')}`;
    })
    .join('|');
}

type HostDirectiveQueryDef = {
  propertyName: string;
  predicate: unknown;
  firstOnly: boolean;
  descendants: boolean;
};

function isUsableQueryPredicate(predicate: unknown): boolean {
  if (predicate == null) {
    return false;
  }
  if (typeof predicate === 'function') {
    return true;
  }
  if (predicate instanceof InjectionToken) {
    return true;
  }
  if (Array.isArray(predicate)) {
    return predicate.some((item) => isUsableQueryPredicate(item));
  }
  // String locators (`contentChild('foo')`) are real selectors, not minified class names.
  return typeof predicate === 'string';
}

/** Field names Ivy assigns in `contentQueries` (`ctx.cell = _t.first`). Types come from TView. */
function contentQueryFieldNames(contentQueries: Function): { names: string[]; firstOnly: Set<string> } {
  const src = Function.prototype.toString.call(contentQueries);
  const firstProps = ivyCtxProps(src, IVY_ASSIGN_FIRST_RE);
  const assignProps = ivyCtxProps(src, IVY_ASSIGN_RE);
  // Prefer the full assignment list (declaration order). `first` props alone would drop
  // multi-result `@ContentChildren` fields when mixed with `@ContentChild` on the same class.
  return {
    names: assignProps.length ? assignProps : firstProps,
    firstOnly: new Set(firstProps),
  };
}

function collectContentQueryFieldNames(ctor: Type<unknown>): { names: string[]; firstOnly: Set<string> } {
  const names: string[] = [];
  const firstOnly = new Set<string>();
  let current: Type<unknown> | null | undefined = ctor;
  let depth = 0;
  while (current && depth < 8) {
    const dir = (current as Type<unknown> & { ɵdir?: { contentQueries?: Function } }).ɵdir;
    if (typeof dir?.contentQueries === 'function') {
      const fields = contentQueryFieldNames(dir.contentQueries);
      for (const name of fields.names) {
        if (!names.includes(name)) {
          names.push(name);
        }
      }
      for (const name of fields.firstOnly) {
        firstOnly.add(name);
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
  return { names, firstOnly };
}

function getDirectiveIndexOnTNode(instance: object): number | null {
  try {
    const ctx = getLContext(instance);
    const lView = ctx?.lView;
    const nodeIndex = ctx?.nodeIndex;
    if (!lView || nodeIndex == null) {
      return null;
    }
    const tNode = lView[1]?.data?.[nodeIndex] as
      | { directiveStart?: number; directiveEnd?: number }
      | undefined;
    const start = tNode?.directiveStart;
    const end = tNode?.directiveEnd;
    if (typeof start === 'number' && typeof end === 'number') {
      for (let i = start; i < end; i++) {
        if (lView[i] === instance) {
          return i - start;
        }
      }
    }
    const native = ctx.native ?? lView[nodeIndex];
    if (native != null) {
      const dirs = ɵgetDirectives(native as Node);
      const idx = dirs.indexOf(instance as never);
      if (idx >= 0) {
        return idx;
      }
    }
  } catch {
    // Host may not be attached yet.
  }
  return null;
}

function contentQueryIndexesForDirective(
  lView: any,
  dirIndex: number | null,
): { indexes: number[]; filtered: boolean } {
  const indexes: number[] = [];
  const contentQueries = lView?.[1]?.contentQueries;
  if (Array.isArray(contentQueries) && dirIndex != null) {
    for (let i = 0; i < contentQueries.length; i += 2) {
      if (contentQueries[i + 1] === dirIndex) {
        indexes.push(contentQueries[i]);
      }
    }
    if (indexes.length) {
      return { indexes, filtered: true };
    }
  }
  const queries = getTQueries(lView)?.queries ?? [];
  for (let i = 0; i < queries.length; i++) {
    if (isContentQueryIndex(lView, i)) {
      indexes.push(i);
    }
  }
  return { indexes, filtered: false };
}

/**
 * Host-directive `@ContentChild` predicates are the live Types stored on TView
 * (`tQuery.metadata.predicate`). Matching uses `instanceof`, not minified names.
 */
function collectQueryDefsFromLView(instance: object, ctor: Type<unknown>): HostDirectiveQueryDef[] {
  try {
    const ctx = getLContext(instance);
    const lView = ctx?.lView;
    if (!lView) {
      return [];
    }
    const tQueries = getTQueries(lView)?.queries;
    if (!Array.isArray(tQueries) || !tQueries.length) {
      return [];
    }
    const fields = collectContentQueryFieldNames(ctor);
    const dirIndex = getDirectiveIndexOnTNode(instance);
    const { indexes, filtered } = contentQueryIndexesForDirective(lView, dirIndex);
    const owned = indexes.filter((index) => isContentQueryIndex(lView, index));
    if (!owned.length) {
      return [];
    }
    if (!filtered && owned.length !== fields.names.length) {
      return [];
    }
    const results: HostDirectiveQueryDef[] = [];
    for (let i = 0; i < owned.length && i < fields.names.length; i++) {
      const tQuery = tQueries[owned[i]];
      const predicate = tQuery?.metadata?.predicate;
      if (!isUsableQueryPredicate(predicate)) {
        continue;
      }
      const propertyName = fields.names[i];
      const flags = tQuery?.metadata?.flags ?? 0;
      results.push({
        propertyName,
        predicate,
        // Per-query: only fields assigned via `_t.first` are firstOnly. Do not
        // promote every query just because the class also has a ContentChild.
        firstOnly: fields.firstOnly.has(propertyName),
        descendants: !!(flags & QUERY_FLAG_DESCENDANTS),
      });
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Collect content queries along the directive inheritance chain (e.g. MatColumnDef → CdkColumnDef).
 *
 * After Ivy linking, `ɵdir.queries` is often stripped. Recover Types from the live TView
 * (or leftover `ɵdir.queries` Type predicates) and match with `instanceof`.
 */
function collectDirectiveQueryDefs(ctor: Type<unknown>, instance?: object): HostDirectiveQueryDef[] {
  const results: HostDirectiveQueryDef[] = [];
  const seen = new Set<string>();
  if (instance) {
    for (const q of collectQueryDefsFromLView(instance, ctor)) {
      if (seen.has(q.propertyName)) {
        continue;
      }
      seen.add(q.propertyName);
      results.push(q);
    }
  }
  let current: Type<unknown> | null | undefined = ctor;
  let depth = 0;
  while (current && depth < 8) {
    const dir = (current as Type<unknown> & { ɵdir?: { queries?: any[] } }).ɵdir;
    if (Array.isArray(dir?.queries)) {
      for (const q of dir!.queries!) {
        const propertyName = typeof q?.propertyName === 'string' ? q.propertyName : null;
        if (!propertyName || seen.has(propertyName)) {
          continue;
        }
        const predicate = q.predicate ?? null;
        if (!isUsableQueryPredicate(predicate)) {
          continue;
        }
        seen.add(propertyName);
        results.push({
          propertyName,
          predicate,
          firstOnly: !!q.first,
          descendants: !!q.descendants,
        });
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
    const listTargets = discoverContentQueryTargets(candidate);
    for (const target of listTargets) {
      if (patchContentQuery(target, parentOutlet, descendantOutlets)) {
        changed = true;
      }
    }
    if (syncHostFieldsFromContentQueryTargets(candidate, listTargets)) {
      changed = true;
    }
    const patchedProps = new Set(
      listTargets.map((target) => target.propertyName).filter((name): name is string => !!name),
    );
    const queryDefs = collectDirectiveQueryDefs(candidate.constructor as Type<unknown>, candidate);
    if (!queryDefs.length) {
      continue;
    }
    for (const q of queryDefs) {
      if (patchedProps.has(q.propertyName)) {
        continue;
      }
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
      const current = (candidate as Record<string, unknown>)[q.propertyName];
      if (current instanceof QueryList) {
        const next = q.firstOnly ? results.slice(0, 1) : results;
        if (resetQueryListIfChanged(current, next)) {
          changed = true;
        }
        continue;
      }
      // Scalar `@ContentChild` fields (e.g. MatColumnDef.cell). Never replace a
      // QueryList with a plain array — Material calls `.toArray()` / `.changes.pipe()`.
      if (!q.firstOnly) {
        continue;
      }
      const next = results[0] ?? null;
      if (!sameSlotValue(current, next)) {
        (candidate as Record<string, unknown>)[q.propertyName] = next;
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
      collectDirectiveQueryDefs(c.constructor as Type<unknown>, c)
        .map((q) => {
          const v = (c as Record<string, unknown>)[q.propertyName];
          return `${q.propertyName}:${hostDirFieldIdentity(v)}`;
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
 * names. Ivy emits `ctx.foo = _t.first`; production minify rewrites locals
 * (`r._formFieldControl=a.first`) but keeps the property name. Inherited queries may live on
 * a parent class — walk the prototype chain. Order is base → subclass so index mapping matches
 * Ivy LView content-query order. Runtime `ɵcmp` has no `queries` array — only the compiled
 * `contentQueries` function is parsed. Fail closed: when nothing matches, field-name binding
 * is skipped. Cached per class.
 */
const contentChildFirstPropsByClass = new WeakMap<object, string[]>();

function collectContentChildFirstPropsFromCtor(ctor: object, firstProps: string[]): void {
  const contentQueries = (ctor as any)?.ɵcmp?.contentQueries;
  if (typeof contentQueries !== 'function') {
    return;
  }
  const src = Function.prototype.toString.call(contentQueries);
  for (const name of ivyCtxProps(src, IVY_ASSIGN_FIRST_RE)) {
    if (!firstProps.includes(name)) {
      firstProps.push(name);
    }
  }
}

function getContentChildFirstProps(instance: object): string[] {
  const ctor = instance.constructor as object;
  const cached = contentChildFirstPropsByClass.get(ctor);
  if (cached) {
    return cached;
  }
  // Collect subclass → base, then reverse so firstProps is base → subclass (LView order).
  const chain: object[] = [];
  let current: object | null = ctor;
  while (current && current !== Object && current !== Function && current !== Object.prototype) {
    chain.push(current);
    current = Object.getPrototypeOf(current);
  }
  const firstProps: string[] = [];
  for (let i = chain.length - 1; i >= 0; i--) {
    collectContentChildFirstPropsFromCtor(chain[i], firstProps);
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
  // Match the unnamed QueryLists to the compiled `_t.first` props in base→subclass order.
  // Only bind props that exist on this instance and are not already claimed.
  const usedProps = new Set(
    targets.map((t) => t.propertyName).filter((name): name is string => !!name),
  );
  const availableProps = firstProps.filter((prop) => prop in instance && !usedProps.has(prop));
  const unboundChildQueries = targets.filter(
    (t) => t.kind === 'query-list' && !t.propertyName,
  );
  for (let i = 0; i < availableProps.length && i < unboundChildQueries.length; i++) {
    unboundChildQueries[i].propertyName = availableProps[i];
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
    if (!target.firstOnly) {
      // A previous patch may have overwritten the QueryList with a plain array
      // (`_buttonToggles.toArray is not a function`). Put the live list back.
      (instance as any)[prop] = target.queryList;
      changed = true;
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
