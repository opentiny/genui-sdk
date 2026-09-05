import { Component, EventEmitter, Input, Output, SimpleChanges, Type, forwardRef } from "@angular/core";
import { RendererMain } from "../renderer-main";
import { ProjectedViews, RENDER_BLOCK_MARKER, SET_PROJECTED_VIEWS } from "./projection/projected-view";

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
      [projectedViews]="_projectedViews">
    </tiny-schema-renderer>
  `,
})
export class RenderBlockComponent extends DynamicProperties {
  public [NAME]!: string;
  public [SCHEMA]!: {
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>,
  };
  public [CHANGES_KEY]!: string[];

  public get _schema() {
    return this[SCHEMA];
  }
  public _props: Record<string, unknown> = {};
  _projectedViews: ProjectedViews | null = null;

  constructor() {
    super();
  }

  [SET_PROJECTED_VIEWS](views: ProjectedViews | null) {
    this._projectedViews = views;
  }

  protected init(name: string, schema: any) {
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
    return Object.keys(this[SCHEMA].inputs || []);
  }
  protected _getUpdatedProps() {
    return this[CHANGES_KEY].reduce((acc: Record<string, unknown>, key: string) => {
      acc[key] = (this as any)[key]
      return acc
    }, {})
  }

  protected _initEventEmitter() {
    Object.keys(this[SCHEMA].outputs).forEach(key => {
      (this as any)[key] = new EventEmitter<any>()
    })
  }

  public _dispatchEvent = (event: string, ...data: any) => {
    if (Object.keys(this[SCHEMA].outputs).includes(event)) {
      ((this as any)[event] as EventEmitter<any>).emit(data)
    } else {
      console.warn(`Event ${event} not found in schema.outputs`)
    }
  }
}

export function getComponentInputs(schema: any, declare = false) {
  return Object.fromEntries(
    Object.entries(schema.inputs).map(([key, value]) => [
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
export function getComponentOutputs(schema: any) {
  return Object.fromEntries(
    Object.entries(schema.outputs).map(([key, value]) => [key, key])
  );
}

/** Depth-first: each schema `NgContent` becomes one slot; `props.select` or `*`. */
export function extractNgContentSelectors(schema: any): string[] {
  const selectors: string[] = [];
  walkNgContent(schema, selectors);
  return selectors;
}

function walkNgContent(node: any, selectors: string[]) {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (node.componentName === 'NgContent') {
    const select = node.props?.select;
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

export function blockComponentFactory(name: string, schema: any): Type<any> {
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

