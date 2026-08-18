import { Directive, ElementRef, Input, ɵgetLContext as getLContext } from '@angular/core';
import { isEqual } from 'lodash';

// LView / LContainer internal layout (Angular 20). See @angular/core root_effect_scheduler.mjs.
const TVIEW = 1;
const NATIVE = 7;
const CONTEXT = 8;
const MOVED_VIEWS = 9;
const CONTAINER_HEADER_OFFSET = 10;
const HEADER_OFFSET = 27;

interface LContext {
  native: unknown;
  nodeIndex: number;
  lView: any[];
}

/**
 * Resolve the LContainer created for this `<ng-template>` anchor. Prefer Angular's
 * debug API (`ɵgetLContext`); fall back to `__ngContext__` when it points at the
 * declaration LView directly.
 */
function readContainer(host: Element): any[] | null {
  try {
    const lContext = getLContext(host) as LContext | null;
    const viaDebug = lContext?.lView?.[lContext.nodeIndex];
    if (Array.isArray(viaDebug)) {
      return viaDebug;
    }
  } catch {
    // ignore — fall through to __ngContext__ scan
  }

  const ctx = (host as any).__ngContext__;
  if (!ctx) {
    return null;
  }
  if (Array.isArray(ctx)) {
    // __ngContext__ = declaration LView — find the template tNode slot (the LContainer).
    const tView = ctx[TVIEW];
    const bindingStart = tView?.bindingStartIndex ?? 0;
    for (let i = HEADER_OFFSET; i < bindingStart; i++) {
      const slot = ctx[i];
      if (Array.isArray(slot) && slot[NATIVE] === host) {
        return slot;
      }
    }
    return null;
  }
  // __ngContext__ = LContext { native, nodeIndex, lView }.
  const lContext = ctx as LContext;
  const container = lContext.lView?.[lContext.nodeIndex];
  return Array.isArray(container) ? container : null;
}

/**
 * Reads the context object that the hosting material passed to `*ngTemplateOutlet`
 * for this schema `NgTemplate`, and exposes selected variables into the render scope
 * according to the schema `props.let` declaration (e.g. `{ labelFromScope: 'label' }`
 * maps the outlet context's `label` to a scope variable `labelFromScope`).
 *
 * Angular does not expose the context via public API. Views rendered via
 * `*ngTemplateOutlet` are tracked in the template's declaration LContainer
 * `MOVED_VIEWS` slot; their `CONTEXT` holds the outlet-provided object.
 */
@Directive({
  selector: 'ng-template[ngSchemaTemplate]',
  standalone: true,
  exportAs: 'schemaTemplateContext',
})
export class SchemaTemplateContextDirective {
  /** Schema `props.let` — parsed `{ localName: contextKey }` mapping. */
  @Input() schemaTemplateLet?: Record<string, any> | null;
  /** Current render scope to extend. */
  @Input() schemaTemplateScope?: Record<string, any> | null;

  private container: any[] | null | undefined;
  private cachedInput: unknown;
  private cachedResult: Record<string, any> | undefined;

  constructor(private readonly host: ElementRef) {}

  /**
   * Extend `schemaTemplateScope` with outlet context vars declared in `schemaTemplateLet`.
   * Returns the same object while inputs are unchanged (value-equality), so downstream
   * embedded views keep a stable scope reference and don't remount every CD.
   */
  resolve(): Record<string, any> {
    const scope = this.schemaTemplateScope ?? {};
    const letMap = this.schemaTemplateLet;

    if (!letMap || typeof letMap !== 'object' || Object.keys(letMap).length === 0) {
      return scope;
    }

    const context = this.getLatestContext();
    const mapped: Record<string, any> = {};
    for (const localName of Object.keys(letMap)) {
      const sourceKey = letMap[localName];
      if (typeof sourceKey === 'string' && (context as any)?.[sourceKey] !== undefined) {
        mapped[localName] = (context as any)[sourceKey];
      }
    }

    const input = { scope, mapped };
    if (isEqual(this.cachedInput, input)) {
      return this.cachedResult ?? scope;
    }
    this.cachedInput = input;
    this.cachedResult = { ...scope, ...mapped };
    return this.cachedResult;
  }

  private getLatestContext(): unknown {
    // Don't cache a failed lookup — the LContainer only exists once the hosting
    // material actually renders this template via *ngTemplateOutlet.
    const container =
      this.container === undefined ? (this.container = readContainer(this.host.nativeElement)) : this.container;
    if (!container) {
      return undefined;
    }
    let latest: unknown;
    // Views created from this template but rendered elsewhere (e.g. via *ngTemplateOutlet)
    // are tracked in the MOVED_VIEWS slot; their CONTEXT holds the outlet-provided object.
    const moved = container[MOVED_VIEWS];
    if (Array.isArray(moved)) {
      for (const view of moved) {
        if (Array.isArray(view) && view[CONTEXT] != null) {
          latest = view[CONTEXT];
        }
      }
    }
    // Views rendered directly at the anchor.
    for (let i = CONTAINER_HEADER_OFFSET; i < container.length; i++) {
      const view = container[i];
      if (Array.isArray(view) && view[CONTEXT] != null) {
        latest = view[CONTEXT];
      }
    }
    return latest;
  }
}
