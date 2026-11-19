import { TemplateRef } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { ContentRefEntry } from './content-query-types';

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

export function getContentOutletLocalRef(outlet: ComponentOutlet): string | null {
  return outletLocalRefs.get(outlet) ?? null;
}
