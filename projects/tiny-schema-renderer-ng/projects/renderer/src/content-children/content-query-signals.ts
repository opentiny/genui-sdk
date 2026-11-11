import { QueryList, signal } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { ContentQueryPatchTarget } from './content-query-types';
import {
  getHostShimBindings,
  getPredicateFromSignalNode,
  rememberShimBinding,
} from './content-query-ivy';
import { resolvePatchResults } from './content-query-match';

/** Shim signals replacing material contentChild(ren)() fields (LView rematerialize would wipe QueryList-only patches). */
const signalShims = new WeakMap<object, ReturnType<typeof signal<any>>>();

/** Null and undefined are the same empty ContentChild result. */
export function sameSlotValue(a: unknown, b: unknown): boolean {
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
export function syncHostSignalShims(
  hostInstance: object,
  parentOutlet: ComponentOutlet,
  descendantOutlets?: ComponentOutlet[] | null,
): boolean {
  const bindings = getHostShimBindings(hostInstance);
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

export function resetQueryListIfChanged(
  queryList: QueryList<unknown>,
  results: unknown[],
): boolean {
  const prev = queryList.toArray();
  if (sameQueryResults(prev, results)) {
    return false;
  }
  // reset() clears dirty so the next CD won't re-wipe via ɵɵqueryRefresh.
  queryList.reset(results);
  queryList.notifyOnChanges();
  return true;
}

/** Patch one content query (QueryList only; signal shims synced via {@link syncHostSignalShims}). */
export function patchContentQuery(
  target: ContentQueryPatchTarget,
  parentOutlet: ComponentOutlet,
  descendantOutlets?: ComponentOutlet[] | null,
): boolean {
  const results = resolvePatchResults(target, parentOutlet, descendantOutlets);
  const changed = resetQueryListIfChanged(target.queryList, results);

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
