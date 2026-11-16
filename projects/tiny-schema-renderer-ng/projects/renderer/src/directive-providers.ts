import { resolveForwardRef } from '@angular/core';

/**
 * Compiled directive defs do not keep `providers` on `ɵdir`. `ɵɵProvidersFeature` closes
 * over the list and only hands it to `providersResolver`, which mutates the current TView
 * during `firstCreatePass`. Call the resolver with a callback that stores the list and
 * throws before that body runs.
 */
type ProvidersResolver = (
  def: object,
  processProvidersFn?: (providers: unknown[]) => unknown[],
) => unknown;

const capturedProviders = new WeakMap<object, readonly unknown[]>();

export function readDeclaredProviders(def: object | null | undefined): readonly unknown[] {
  if (!def) {
    return [];
  }
  const declared = (def as { providers?: unknown }).providers;
  if (Array.isArray(declared)) {
    return declared;
  }
  const cached = capturedProviders.get(def);
  if (cached) {
    return cached;
  }
  const resolver = (def as { providersResolver?: ProvidersResolver }).providersResolver;
  if (typeof resolver !== 'function') {
    return [];
  }
  let captured: unknown[] | undefined;
  const stop = new Error('read-declared-providers');
  try {
    resolver(def, (providers) => {
      captured = Array.isArray(providers) ? providers : [];
      throw stop;
    });
  } catch (err) {
    if (err !== stop) {
      throw err;
    }
  }
  const list = captured ?? [];
  capturedProviders.set(def, list);
  return list;
}

/** Tokens this class re-provides with `{ provide, useExisting }` pointing at itself. */
export function useExistingProviderTokens(
  def: object | null | undefined,
  directiveClass: Function,
): unknown[] {
  const tokens: unknown[] = [];
  for (const entry of readDeclaredProviders(def)) {
    if (!entry || typeof entry !== 'object' || !('provide' in entry) || !('useExisting' in entry)) {
      continue;
    }
    const record = entry as { provide: unknown; useExisting: unknown };
    const existing = resolveForwardRef(record.useExisting as never);
    if (record.provide != null && record.provide !== directiveClass && existing === directiveClass) {
      tokens.push(record.provide);
    }
  }
  return tokens;
}
