import { QueryList, TemplateRef } from '@angular/core';
import { ComponentOutlet } from '../component-outlet';

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

/** Schema componentName for the NgTemplate bypass (not a material). */
export const NG_TEMPLATE_SCHEMA_NAME = 'NgTemplate';
