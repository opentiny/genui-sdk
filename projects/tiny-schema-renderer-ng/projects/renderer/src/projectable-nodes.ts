import { Type } from '@angular/core';

/**
 * Read ng-content slot selectors from a component def (order = projectableNodes indices).
 * Falls back to a single default slot `['*']`.
 */
export function getNgContentSelectors(componentType: Type<any> | null | undefined): string[] {
  const selectors = (componentType as any)?.ɵcmp?.ngContentSelectors;
  if (Array.isArray(selectors) && selectors.length > 0) {
    return selectors as string[];
  }
  return ['*'];
}

/** Flatten schema props that will be applied as host attributes (incl. nested `attributes`). */
export function getSchemaAttributeMap(schema: any): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return {};
  }
  const props = schema.props && typeof schema.props === 'object' ? schema.props : {};
  const nested =
    props.attributes && typeof props.attributes === 'object'
      ? (props.attributes as Record<string, unknown>)
      : {};
  // Nested attributes first; top-level props override (same as typical attr merge).
  return { ...nested, ...props };
}

/**
 * Whether a schema child would match an ng-content `select` after attrs are written to the host.
 * Mirrors CSS attribute / tag selectors used by Angular projection (scheme 3).
 */
export function schemaChildMatchesSelector(schema: any, selector: string): boolean {
  if (!selector || selector === '*') {
    return true;
  }

  // Attribute selector: [header] | [header=value] | [header="value"]
  const attrMatch = /^\[([^\]]+)\]$/.exec(selector.trim());
  if (attrMatch) {
    const body = attrMatch[1].trim();
    const eq = body.indexOf('=');
    const name = (eq === -1 ? body : body.slice(0, eq)).trim();
    const expected =
      eq === -1
        ? undefined
        : body
            .slice(eq + 1)
            .trim()
            .replace(/^['"]|['"]$/g, '');
    const attrs = getSchemaAttributeMap(schema);
    if (!(name in attrs)) {
      return false;
    }
    const actual = attrs[name];
    if (expected === undefined) {
      // [header] — presence; treat false/null as absent
      return actual !== false && actual != null;
    }
    return String(actual) === expected;
  }

  // Simple tag selector (e.g. select="app-list-item")
  if (/^[a-zA-Z][\w-]*$/.test(selector.trim())) {
    const tag = selector.trim().toLowerCase();
    const name = String(schema?.componentName ?? '').toLowerCase();
    return name === tag;
  }

  // Class / complex selectors: best-effort via a temporary element when possible
  return false;
}

/**
 * Assign each schema child to the first matching ng-content selector (Angular projection order).
 * `*` is the catch-all and is skipped until no earlier selector matches.
 */
export function classifySchemaChildrenByNgContentSelectors(
  children: any[],
  selectors: string[],
): any[][] {
  const list = Array.isArray(children) ? children : [];
  const buckets = selectors.map(() => [] as any[]);
  const starIndex = selectors.findIndex((s) => s === '*');

  for (const child of list) {
    let placed = false;
    for (let i = 0; i < selectors.length; i++) {
      const sel = selectors[i];
      if (sel === '*') {
        continue;
      }
      if (schemaChildMatchesSelector(child, sel)) {
        buckets[i].push(child);
        placed = true;
        break;
      }
    }
    if (!placed) {
      const idx = starIndex >= 0 ? starIndex : Math.max(0, selectors.length - 1);
      buckets[idx].push(child);
    }
  }

  return buckets;
}

/** Partition already-rendered DOM nodes by Element.matches (scheme 3 runtime path). */
export function partitionNodesByNgContentSelectors(
  nodes: Node[],
  selectors: string[],
): Node[][] {
  const buckets = selectors.map(() => [] as Node[]);
  const starIndex = selectors.findIndex((s) => s === '*');

  for (const node of nodes) {
    let placed = false;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      for (let i = 0; i < selectors.length; i++) {
        const sel = selectors[i];
        if (sel === '*') {
          continue;
        }
        try {
          if (el.matches(sel)) {
            buckets[i].push(node);
            placed = true;
            break;
          }
        } catch {
          // invalid selector — skip
        }
      }
    }
    if (!placed) {
      const idx = starIndex >= 0 ? starIndex : Math.max(0, selectors.length - 1);
      buckets[idx].push(node);
    }
  }

  return buckets;
}
