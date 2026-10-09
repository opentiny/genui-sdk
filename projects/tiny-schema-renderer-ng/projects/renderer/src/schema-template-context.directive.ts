import { Directive, ElementRef, Input, ɵgetLContext as getLContext, ɵɵgetCurrentView as getCurrentView } from '@angular/core';
import { isEqual } from 'lodash';

// LView / LContainer internal layout (Angular 20). See @angular/core root_effect_scheduler.mjs.
const TVIEW = 1;
const PARENT = 3;
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

function viewIndexInContainer(container: any[], view: any[]): number {
  for (let i = CONTAINER_HEADER_OFFSET; i < container.length; i++) {
    if (container[i] === view) {
      return i;
    }
  }
  return -1;
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
 *
 * Schema structural directives (`NgIf` / `NgForOf` on this ng-template) stamp views
 * directly into the same LContainer; those are matched via `getCurrentView()` as well.
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
   * Even without `let`, a detached copy is returned so inner refName registrations
   * stay local to the template and don't leak into the outer scope.
   */
  resolve(): Record<string, any> {
    const scope = this.schemaTemplateScope ?? {};
    const letMap = this.schemaTemplateLet;

    const mapped: Record<string, any> = {};
    if (letMap && typeof letMap === 'object') {
      const context = this.getLatestContext();
      for (const localName of Object.keys(letMap)) {
        const sourceKey = letMap[localName];
        if (typeof sourceKey === 'string' && (context as any)?.[sourceKey] !== undefined) {
          mapped[localName] = (context as any)[sourceKey];
        }
      }
    }

    const input = { scope, mapped };
    if (isEqual(this.cachedInput, input)) {
      return this.cachedResult ?? { ...scope, ...mapped };
    }
    this.cachedInput = input;
    this.cachedResult = { ...scope, ...mapped };
    return this.cachedResult;
  }

  private getLatestContext(): unknown {
    // Host *ngTemplateOutlet → MOVED_VIEWS; schema NgIf/NgForOf → container slots.
    // Walk getCurrentView() PARENT chain and match by reference so each NgFor row
    // resolves its own context (not the last stamped view).
    const container =
      this.container ?? (this.container = readContainer(this.host.nativeElement) ?? null);
    const moved = container?.[MOVED_VIEWS];
    try {
      let view = getCurrentView() as unknown as any[] | null;
      let depth = 0;
      while (view && depth < 32) {
        if (Array.isArray(moved) && moved.indexOf(view) !== -1) {
          return view[CONTEXT];
        }
        if (container && viewIndexInContainer(container, view) !== -1) {
          return view[CONTEXT];
        }
        const next = view[PARENT];
        if (!Array.isArray(next)) {
          break;
        }
        view = next;
        depth++;
      }
    } catch {
      // fall through to direct-render scan
    }
    if (!container) {
      return undefined;
    }
    let latest: unknown;
    for (let i = CONTAINER_HEADER_OFFSET; i < container.length; i++) {
      const view = container[i];
      if (Array.isArray(view) && view[CONTEXT] != null) {
        latest = view[CONTEXT];
      }
    }
    return latest;
  }
}
