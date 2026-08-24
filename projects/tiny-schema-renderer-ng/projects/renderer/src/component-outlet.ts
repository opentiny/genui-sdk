import {
  ComponentRef,
  createNgModule,
  Directive,
  EnvironmentInjector,
  Injector,
  Input,
  NgModuleRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Type,
  ViewContainerRef,
  Binding,
  inputBinding,
  outputBinding,
  Self,
  Inject,
  Optional,
} from '@angular/core';
import { toOnEventName } from './parser/event-utils';
import { isSchemaRefPropKey, SCHEMA_REF_BRIDGE, SchemaRefBridge } from './schema-ref';

/**
 * Instantiates a {@link /api/core/Component Component} type and inserts its Host View into the current View.
 * `NgComponentOutlet` provides a declarative approach for dynamic component creation.
 *
 * `NgComponentOutlet` requires a component type, if a falsy value is set the view will clear and
 * any existing component will be destroyed.
 *
 * @usageNotes
 *
 * ### Fine tune control
 *
 * You can control the component creation process by using the following optional attributes:
 *
 * * `ngComponentOutletInputs`: Optional component inputs object, which will be bind to the
 * component.
 *
 * * `ngComponentOutletInjector`: Optional custom {@link Injector} that will be used as parent for
 * the Component. Defaults to the injector of the current view container.
 *
 * * `ngComponentOutletEnvironmentInjector`: Optional custom {@link EnvironmentInjector} which will
 * provide the component's environment.
 *
 * * `ngComponentOutletContent`: Optional list of projectable nodes to insert into the content
 * section of the component, if it exists.
 *
 * * `ngComponentOutletNgModule`: Optional NgModule class reference to allow loading another
 * module dynamically, then loading a component from that module.
 *
 *
 * ### Syntax
 *
 * Simple
 * ```html
 * <ng-container *ngComponentOutlet="componentTypeExpression"></ng-container>
 * ```
 *
 * With inputs
 * ```html
 * <ng-container *ngComponentOutlet="componentTypeExpression;
 *                                   inputs: inputsExpression;">
 * </ng-container>
 * ```
 *
 * Customized injector/content
 * ```html
 * <ng-container *ngComponentOutlet="componentTypeExpression;
 *                                   injector: injectorExpression;
 *                                   content: contentNodesExpression;">
 * </ng-container>
 * ```
 *
 * Customized NgModule reference
 * ```html
 * <ng-container *ngComponentOutlet="componentTypeExpression;
 *                                   ngModule: ngModuleClass;">
 * </ng-container>
 * ```
 *
 * ### A simple example
 *
 * {@example common/ngComponentOutlet/ts/module.ts region='SimpleExample'}
 *
 * A more complete example with additional options:
 *
 * {@example common/ngComponentOutlet/ts/module.ts region='CompleteExample'}
 *
 * @publicApi
 * @ngModule CommonModule
 */
@Directive({
  selector: '[componentOutlet]',
  exportAs: 'componentOutlet',
  providers: [
    {
      provide: ComponentRef,
      useFactory: (componentOutlet: ComponentOutlet) => componentOutlet._componentRef,
      deps: [[new Self(), ComponentOutlet]],
    },
  ],
})
export class ComponentOutlet<T = any> implements OnChanges, OnDestroy {
  /** Component that should be rendered in the outlet. */
  @Input('componentOutlet') ngComponentOutlet: Type<T> | null = null;

  // @deprecated('use ngComponentOutletProps instead')
  @Input('componentOutletInputs') ngComponentOutletInputs?: Record<string, unknown>;
  @Input('componentOutletInjector') ngComponentOutletInjector?: Injector;
  @Input('componentOutletEnvironmentInjector')
  ngComponentOutletEnvironmentInjector?: EnvironmentInjector;
  @Input('componentOutletContent') ngComponentOutletContent?: Node[][];

  @Input('componentOutletNgModule') ngComponentOutletNgModule?: Type<any>;
  @Input('componentOutletProps') ngComponentOutletProps?: Record<string, unknown>;
  @Input('componentOutletDirectives') ngComponentOutletDirectives?: Type<any>[] | undefined;
  @Input('componentOutletDirectiveModules') ngComponentOutletDirectiveModules?: Type<any>[] | undefined;

  private _componentRef: ComponentRef<T> | undefined;
  private _moduleRef: NgModuleRef<any> | undefined;
  private _directiveModuleRefs: NgModuleRef<any>[] = [];

  /**
   * Gets the instance of the currently-rendered component.
   * Will be null if no component has been rendered.
   */
  get componentInstance(): T | null {
    return this._componentRef?.instance ?? null;
  }

  get componentRef(): ComponentRef<T> | undefined {
    return this._componentRef;
  }

  private _componentInjector: Injector | undefined = undefined;
  public get componentInjector(): Injector | undefined {
    return this._componentInjector;
  }

  // Memoized DI parent; rebuilt only when ngComponentOutletInjector changes.
  private _componentParentInjector: Injector | undefined = undefined;

  private bindProps: Record<string, any> = {};
  private get schemaRefBridge(): SchemaRefBridge | undefined {
   // Lazy: SchemaRefDirective ↔ ComponentOutlet would cycle if injected in field initializers.
    return this.injector?.get(SCHEMA_REF_BRIDGE, undefined);
  }

  constructor(
    private _viewContainerRef: ViewContainerRef,
    @Inject(Injector) private injector?: Injector
  ) { }

  private _needToReCreateNgModuleInstance(changes: SimpleChanges): boolean {
    // Note: square brackets property accessor is safe for Closure compiler optimizations (the
    // `changes` argument of the `ngOnChanges` lifecycle hook retains the names of the fields that
    // were changed).
    return changes['ngComponentOutletNgModule'] !== undefined;
  }

  private _needToReCreateDirectivesInstance(changes: SimpleChanges): boolean {
    return changes['ngComponentOutletDirectives'] !== undefined;
  }

  private _needToReCreateDirectiveModulesInstance(changes: SimpleChanges): boolean {
    return changes['ngComponentOutletDirectiveModules'] !== undefined;
  }

  private _needToReCreateComponentInstance(changes: SimpleChanges): boolean {
    // Note: square brackets property accessor is safe for Closure compiler optimizations (the
    // `changes` argument of the `ngOnChanges` lifecycle hook retains the names of the fields that
    // were changed).
    return (
      changes['ngComponentOutlet'] !== undefined ||
      changes['ngComponentOutletContent'] !== undefined ||
      changes['ngComponentOutletInjector'] !== undefined ||
      changes['ngComponentOutletEnvironmentInjector'] !== undefined ||
      this._needToReCreateNgModuleInstance(changes) ||
      this._needToReCreateDirectivesInstance(changes) ||
      this._needToReCreateDirectiveModulesInstance(changes)
    );
  }

  /** @docs-private */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['ngComponentOutletProps']) {
      this.bindProps = changes['ngComponentOutletProps'].currentValue ?? {};
      this._componentRef?.changeDetectorRef.markForCheck();
    }
    if (this._needToReCreateComponentInstance(changes)) {
      this.schemaRefBridge?.detach();
      this._viewContainerRef.clear();
      this._componentRef = undefined;
      this._componentInjector = undefined;

      if (changes['ngComponentOutletInjector']) {
        this._componentParentInjector = undefined;
      }

      if (this.ngComponentOutlet) {
        // Parent the component on the caller injector, else the anchor's parent injector
        // (mirrors NgComponentOutlet), so the created component stays a sibling of the anchor
        // and [componentOutlet] host directives stay invisible to @Self/@Host.
        const injector = this.ngComponentOutletInjector ?? this._viewContainerRef.parentInjector;

        if (this._needToReCreateNgModuleInstance(changes)) {
          this._moduleRef?.destroy();

          if (this.ngComponentOutletNgModule) {
            this._moduleRef = createNgModule(
              this.ngComponentOutletNgModule,
              getParentInjector(injector),
            );
          } else {
            this._moduleRef = undefined;
          }
        }

        if (
          this._needToReCreateNgModuleInstance(changes) ||
          this._needToReCreateDirectiveModulesInstance(changes)
        ) {
          this._recreateDirectiveModules(injector);
        }

        this._componentRef = this._viewContainerRef.createComponent(this.ngComponentOutlet, {
          injector: this.resolveComponentInjector(injector),
          projectableNodes: this.ngComponentOutletContent,
          environmentInjector:
            this.ngComponentOutletEnvironmentInjector ?? this._resolveEnvironmentInjector(),
          directives: (this.ngComponentOutletDirectives ?? []).map((directive) => ({
            type: directive,
            bindings: this.getDirectiveBindings(directive),
          })),
          bindings: this.getComponentBindings(this.ngComponentOutlet),
        });
        this._componentInjector = this._componentRef.injector;
        this.schemaRefBridge?.attach(this._componentRef);
      }
    }
  }

  /** @docs-private */
  ngOnDestroy() {
    this.schemaRefBridge?.detach();
    this._directiveModuleRefs.forEach((ref) => ref.destroy());
    this._directiveModuleRefs = [];
    this._moduleRef?.destroy();
  }

  /**
   * 为每个非 standalone 指令创建其声明导出的 NgModule，链到组件模块（或应用模块）之上，
   * 使指令的模块级 provider（如 TooltipModule 的 OverlayContainerRef）在 host directive 的
   * DI 链中可见。
   */
  private _recreateDirectiveModules(injector: Injector) {
    this._directiveModuleRefs.forEach((ref) => ref.destroy());
    this._directiveModuleRefs = [];

    let parent = this._moduleRef
      ? this._moduleRef.injector
      : getParentInjector(injector);

    for (const module of this.ngComponentOutletDirectiveModules ?? []) {
      const ref = createNgModule(module, parent);
      this._directiveModuleRefs.push(ref);
      parent = ref.injector;
    }
  }

  /**
   * Component DI parent (memoized). Parent on `parent`, but re-provide `ComponentOutlet` as
   * `this` so descendant outlets' `@SkipSelf() ComponentOutlet` resolves the parent outlet —
   * otherwise switching to parentInjector drops the anchor node injector that hosts it.
   */
  private resolveComponentInjector(parent: Injector): Injector {
    if (this._componentParentInjector) {
      return this._componentParentInjector;
    }
    this._componentParentInjector = Injector.create({
      parent,
      providers: [{ provide: ComponentOutlet, useValue: this }],
    });
    return this._componentParentInjector;
  }

  private _resolveEnvironmentInjector(): EnvironmentInjector | undefined {
    const top = this._directiveModuleRefs[this._directiveModuleRefs.length - 1];
    if (top) {
      return top.injector;
    }
    return this._moduleRef?.injector;
  }

  protected getComponentBindings(component: Type<any>) {
    if (!('ɵcmp' in component)) {
      return [];
    }
    const componentDef = (component as any)['ɵcmp']!;
    const bindings: Binding[] = [];
    Object.keys(componentDef.inputs).forEach((inputKey) => {
      // props.ref / props.refName are schema wiring — never component @Input.
      if (isSchemaRefPropKey(inputKey)) {
        return;
      }
      if (inputKey in this.bindProps) {
        bindings.push(inputBinding(inputKey, () => this.bindProps[inputKey]));
      }
    });
    Object.keys(componentDef.outputs).forEach((outputKey) => {
      const onEventName = toOnEventName(outputKey);
      if (onEventName in this.bindProps) {
        bindings.push(outputBinding(outputKey, (...args) => this.bindProps[onEventName](...args)));
      }
    });
    return bindings;
  }

  protected getDirectiveBindings(directive: Type<any>) {
    if (!('ɵdir' in directive)) {
      return [];
    }
    const directiveDef = (directive as any)['ɵdir']!;
    const bindings: Binding[] = [];
    Object.keys(directiveDef.inputs).forEach((inputKey) => {
      if (inputKey in this.bindProps) {
        bindings.push(inputBinding(inputKey, () => this.bindProps[inputKey]));
      }
    });
    Object.keys(directiveDef.outputs).forEach((outputKey) => {
      const onEventName = toOnEventName(outputKey);
      if (onEventName in this.bindProps) {
        bindings.push(outputBinding(outputKey, (...args) => this.bindProps[onEventName](...args)));
      }
    });
    return bindings;
  }
}
// Helper function that returns an Injector instance of a parent NgModule.
function getParentInjector(injector: Injector): Injector {
  const parentNgModule = injector.get(NgModuleRef);
  return parentNgModule.injector;
}
