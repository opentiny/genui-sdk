import { ComponentOutlet } from '../component-outlet';
import { getContentRefs, type ContentRefEntry } from '../content-children';

/**
 * Map block schema `contentRefs: { key: refName }` to runtime values from the
 * usage-site ContentChildren registry under the block's {@link ComponentOutlet}.
 */
export function resolveBlockContentRefs(
  outlet: ComponentOutlet,
  decl: Record<string, string> | null | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!decl || typeof decl !== 'object') {
    return result;
  }
  const entries = getContentRefs(outlet);
  for (const [key, refName] of Object.entries(decl)) {
    if (typeof refName !== 'string' || !refName.trim()) {
      continue;
    }
    const name = refName.trim();
    const entry = entries.find((e) => e.refName === name);
    if (!entry) {
      continue;
    }
    const value = resolveContentRefValue(entry);
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function resolveContentRefValue(entry: ContentRefEntry): unknown {
  if (entry.kind === 'template') {
    return entry.templateRef;
  }
  return entry.outlet.componentInstance ?? undefined;
}

/** True when the schema declares at least one contentRefs mapping. */
export function hasContentRefsDecl(schema: { contentRefs?: unknown } | null | undefined): boolean {
  const decl = schema?.contentRefs;
  return !!decl && typeof decl === 'object' && Object.keys(decl as object).length > 0;
}
