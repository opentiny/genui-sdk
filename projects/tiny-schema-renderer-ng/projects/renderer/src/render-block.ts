import { Component, EventEmitter, Input, Output, SimpleChanges, Type, forwardRef } from "@angular/core";
import { RendererMain } from "./renderer-main";

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
      [schema]="schema"
      [props]="props"
      [dispatchEvent]="dispatchEvent">
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


  @Input({ required: false }) propExample: string = 'test';
  @Output() eventExample: EventEmitter<string> = new EventEmitter<string>();

  public get schema() {
    return this[SCHEMA];
  }
  public props: Record<string, unknown> = {};

  constructor() {
    super();
  }

  protected init(name: string, schema: any) {
    this[NAME] = name;
    this[SCHEMA] = schema;
    this[CHANGES_KEY] = this._getChangesKeys()
    this._initEventEmitter();
    this.props = this._getUpdatedProps();
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
      this.props = this._getUpdatedProps()
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

  public dispatchEvent = (event: string, ...data: any) => {
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
      this.init(name, schema);
    }
  };

  const factory = (t?: Type<any>) => new (t ?? componentType)();
  const ɵcmp = Object.create((RenderBlockComponent as any)['ɵcmp']);
  ɵcmp.type = componentType;
  ɵcmp.factory = factory;
  ɵcmp.tView = null;
  ɵcmp.selectors = [[toKebabCase(name)]];
  ɵcmp.inputs = getComponentInputs(schema);
  ɵcmp.declaredInputs = getComponentInputs(schema, true);
  ɵcmp.outputs = getComponentOutputs(schema);
  (componentType as any).ɵfac = factory;
  (componentType as any).ɵcmp = ɵcmp;

  return componentType;
}

