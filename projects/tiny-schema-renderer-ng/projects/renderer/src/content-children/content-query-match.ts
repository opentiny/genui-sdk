import { InjectionToken, Injector, TemplateRef, Type, ɵgetDirectives } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import {
  ContentQueryPatchTarget,
  ContentRefEntry,
  TemplateContentRefEntry,
} from './content-query-types';
import {
  getContentOutletLocalRef,
  getContentRefs,
  getTemplateDirectiveInstances,
} from './content-ref-registry';

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
  const ref = getContentOutletLocalRef(outlet);
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
