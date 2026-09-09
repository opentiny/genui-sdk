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

/** Class tokens declared by the schema (props.class / props.className / attributes.class). */
function getSchemaClassList(schema: any): string[] {
  const attrs = getSchemaAttributeMap(schema);
  const value = attrs['class'] ?? attrs['className'];
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}

/** Split a selector list on top-level commas (ignores commas inside `()` / `[]`). */
function splitSelectorList(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of selector) {
    if (ch === '(' || ch === '[') {
      depth++;
    } else if (ch === ')' || ch === ']') {
      depth--;
    }
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

/** True when `selector` contains a pseudo-class other than a supported `:not(...)`. */
function hasUnsupportedPseudo(selector: string): boolean {
  const pseudoRe = /:[\w-]+(?:\([^)]*\))?/g;
  let m: RegExpExecArray | null;
  while ((m = pseudoRe.exec(selector))) {
    if (!/^:not\(/i.test(m[0])) {
      return true;
    }
  }
  return false;
}

/** Evaluate one `[attr]` / `[attr=value]` token against the schema attribute map. */
function matchAttributeSelector(attrs: Record<string, unknown>, body: string): boolean {
  const eq = body.indexOf('=');
  const name = (eq === -1 ? body : body.slice(0, eq)).trim();
  const expected =
    eq === -1
      ? undefined
      : body
          .slice(eq + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
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

/**
 * Whether a schema child would match an ng-content `select` after attrs are written to the host.
 * Mirrors the CSS selectors Angular projection supports: `*`, tag, `[attr]`, `[attr=value]`,
 * `.class`, and compound forms (e.g. `app-list-item.active`, `[header][disabled]`), plus
 * comma-separated selector lists.
 */
export function schemaChildMatchesSelector(schema: any, selector: string): boolean {
  const sel = selector.trim();
  if (!sel || sel === '*') {
    return true;
  }

  // Selector list: "a, b, c"
  if (sel.includes(',')) {
    return splitSelectorList(sel).some((part) => schemaChildMatchesSelector(schema, part));
  }

  const attrs = getSchemaAttributeMap(schema);
  const tag = String(schema?.componentName ?? '').toLowerCase();
  const classes = new Set(getSchemaClassList(schema));

  // Tokenize a compound selector: tag | .class | [attr] | [attr=value] | :pseudo
  const tokenRe = /\[[^\]]+\]|\.[\w-]+|[a-zA-Z][\w-]*|\*|:[\w-]+(?:\([^)]*\))?/g;
  let token: RegExpExecArray | null;
  let saw = false;
  while ((token = tokenRe.exec(sel))) {
    const t = token[0];
    saw = true;
    if (t.startsWith('[')) {
      if (!matchAttributeSelector(attrs, t.slice(1, -1).trim())) {
        return false;
      }
    } else if (t.startsWith('.')) {
      if (!classes.has(t.slice(1))) {
        return false;
      }
    } else if (t.startsWith(':')) {
      const not = /^:not\(([\s\S]*)\)$/i.exec(t);
      if (not) {
        const inner = not[1].trim();
        // Unsupported nested selector / pseudo (e.g. `:not(:hover)`) — reject the whole selector.
        if (!inner || hasUnsupportedPseudo(inner)) {
          return false;
        }
        // `:not(X)` matches when X does not match.
        if (schemaChildMatchesSelector(schema, inner)) {
          return false;
        }
      }
      // Other pseudo-classes/elements are outside the supported contract — ignore.
    } else if (t !== '*') {
      if (tag !== t.toLowerCase()) {
        return false;
      }
    }
  }
  return saw;
}

/**
 * Assign each schema child to the first matching ng-content selector (Angular projection order).
 * `*` is the catch-all and is skipped until no earlier selector matches.
 * Also returns, per slot, the original index of each child in `children` — lets content
 * queries follow schema declaration order even when slots reorder children.
 */
export function classifySchemaChildrenByNgContentSelectors(
  children: any[],
  selectors: string[],
): { buckets: any[][]; originalIndexes: number[][] } {
  const list = Array.isArray(children) ? children : [];
  const buckets = selectors.map(() => [] as any[]);
  const originalIndexes = selectors.map(() => [] as number[]);
  const starIndex = selectors.findIndex((s) => s === '*');

  for (let childIndex = 0; childIndex < list.length; childIndex++) {
    const child = list[childIndex];
    let placed = false;
    for (let i = 0; i < selectors.length; i++) {
      const sel = selectors[i];
      if (sel === '*') {
        continue;
      }
      if (schemaChildMatchesSelector(child, sel)) {
        buckets[i].push(child);
        originalIndexes[i].push(childIndex);
        placed = true;
        break;
      }
    }
    if (!placed) {
      const idx = starIndex >= 0 ? starIndex : Math.max(0, selectors.length - 1);
      buckets[idx].push(child);
      originalIndexes[idx].push(childIndex);
    }
  }

  return { buckets, originalIndexes };
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
