import { Component, EventEmitter, SimpleChanges, Type, forwardRef } from "@angular/core";
import { RendererMain } from "../renderer-main";
import { getBlockInputNames, getBlockOutputNames, type BlockSchema, type BlockSchemaNode } from "./block-schema";
import { ProjectedViews, RENDER_BLOCK_MARKER, SET_CONTENT_REFS, SET_PROJECTED_VIEWS } from "./projection/projected-view";

const NAME = Symbol('name');
const SCHEMA = Symbol('schema');
const CHANGES_KEY = Symbol('changesKey');
class DynamicProperties implements Record<string, unknown> {
  [key: string]: unknown;
}
@Component({
  selector: 'render-block',
  imports: [
    forwardRef(() => RendererMain)
  ],
  standalone: true,
  template: `
    <tiny-schema-renderer
      [schema]="_schema"
      [props]="_props"
      [dispatchEvent]="_dispatchEvent"
      [projectedViews]="_projectedViews"
      [contentRefs]="_contentRefs">
    </tiny-schema-renderer>
  `,
})
export class RenderBlockComponent extends DynamicProperties {
  public [NAME]!: string;
  public [SCHEMA]!: BlockSchema;
  public [CHANGES_KEY]!: string[];

  public get _schema() {
    return this[SCHEMA];
  }
  public _props: Record<string, unknown> = {};
  _projectedViews: ProjectedViews | null = null;
  _contentRefs: Record<string, unknown> = {};

  constructor() {
    super();
  }

  [SET_PROJECTED_VIEWS](views: ProjectedViews | null) {
    this._projectedViews = views;
  }

  [SET_CONTENT_REFS](refs: Record<string, unknown> | null) {
    this._contentRefs = refs ?? {};
  }

  protected init(name: string, schema: BlockSchema) {
    this[NAME] = name;
    this[SCHEMA] = schema;
    this[CHANGES_KEY] = this._getChangesKeys()
    this._initEventEmitter();
    this._props = this._getUpdatedProps();
  }

  ngOnChanges(changes: SimpleChanges) {
    let needUpdateProps = false;
    this[CHANGES_KEY].forEach(key => {
      if (changes[key]) {
        (this as any)[key] = changes[key].currentValue
        needUpdateProps = true;
      }
    })
    if (needUpdateProps) {
      this._props = this._getUpdatedProps()
    }
  }

  protected _getChangesKeys() {
    return getBlockInputNames(this[SCHEMA]);
  }
  protected _getUpdatedProps() {
    return this[CHANGES_KEY].reduce((acc: Record<string, unknown>, key: string) => {
      acc[key] = (this as any)[key]
      return acc
    }, {})
  }

  protected _initEventEmitter() {
    getBlockOutputNames(this[SCHEMA]).forEach(key => {
      (this as any)[key] = new EventEmitter<any>()
    })
  }

  public _dispatchEvent = (event: string, ...data: any) => {
    const outputNames = getBlockOutputNames(this[SCHEMA])
    if (outputNames.includes(event)) {
      // Single payload: emit the value itself so `(out)="fn($event)"` gets the original
      // argument, not a one-element array. Multiple args keep the array form.
      const payload = data.length === 1 ? data[0] : data;
      ((this as any)[event] as EventEmitter<any>).emit(payload)
    } else {
      console.warn(`Event ${event} not found in schema.events`)
    }
  }
}

export function getComponentInputs(schema: BlockSchema, declare = false) {
  return Object.fromEntries(
    getBlockInputNames(schema).map((key) => [
      key,
      declare
      ? key
      : [key, 0, null]  // [alias, inputFlag, transform]
        /* InputFlag:
          - None = 0
          - SignalBased = 1          // input()
          - HasDecoratorInputTransform = 2  // @Input({ transform })
        */
    ])
  );
}
export function getComponentOutputs(schema: BlockSchema) {
  return Object.fromEntries(
    getBlockOutputNames(schema).map((key) => [key, key])
  );
}

/** Depth-first: each schema `NgContent` becomes one slot; `props.select` or `*`. */
export function extractNgContentSelectors(schema: BlockSchemaNode): string[] {
  const selectors: string[] = [];
  walkNgContent(schema, selectors);
  return selectors;
}

function walkNgContent(node: BlockSchemaNode | null | undefined, selectors: string[]) {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (node.componentName === 'NgContent') {
    const select = node.props?.['select'];
    selectors.push(typeof select === 'string' && select.trim() ? select.trim() : '*');
  }
  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      walkNgContent(child, selectors);
    }
  }
}

function toKebabCase(name: string) {
  return (
    name.match(/[A-Z]{2,}(?=[A-Z][a-z0-9]|[0-9]|$)|[A-Z]?[a-z0-9]+|[A-Z]/g) ?? [name]
  )
    .join('-')
    .toLowerCase();
}

export function blockComponentFactory(name: string, schema: BlockSchema): Type<any> {
  const componentType = class extends RenderBlockComponent {
    constructor() {
      super();
      super.init(name, schema);
    }
  };

  const factory = (t?: Type<any>) => new (t ?? componentType)();
  const ɵcmp = Object.create((RenderBlockComponent as any)['ɵcmp']);
  ɵcmp.type = componentType;
  ɵcmp.factory = factory;
  ɵcmp.tView = null;
  ɵcmp.selectors = [[toKebabCase(name)]];
  ɵcmp.ngContentSelectors = extractNgContentSelectors(schema);
  ɵcmp[RENDER_BLOCK_MARKER] = true;
  ɵcmp.inputs = getComponentInputs(schema);
  ɵcmp.declaredInputs = getComponentInputs(schema, true);
  ɵcmp.outputs = getComponentOutputs(schema);
  (componentType as any).ɵfac = factory;
  (componentType as any).ɵcmp = ɵcmp;

  return componentType;
}

