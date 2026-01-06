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
} from '@angular/core';
import { toOnEventName } from './parser/event-utils';

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

  private _componentRef: ComponentRef<T> | undefined;
  private _moduleRef: NgModuleRef<any> | undefined;

  /**
   * Gets the instance of the currently-rendered component.
   * Will be null if no component has been rendered.
   */
  get componentInstance(): T | null {
    return this._componentRef?.instance ?? null;
  }

  private _componentInjector: Injector | undefined = undefined;
  public get componentInjector(): Injector | undefined {
    return this._componentInjector;
  }

  private bindProps: Record<string, any> = {};

  constructor(private _viewContainerRef: ViewContainerRef) {}

  private _needToReCreateNgModuleInstance(changes: SimpleChanges): boolean {
    // Note: square brackets property accessor is safe for Closure compiler optimizations (the
    // `changes` argument of the `ngOnChanges` lifecycle hook retains the names of the fields that
    // were changed).
    return changes['ngComponentOutletNgModule'] !== undefined;
  }

  private _needToReCreateDirectivesInstance(changes: SimpleChanges): boolean {
    return changes['ngComponentOutletDirectives'] !== undefined;
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
      this._needToReCreateDirectivesInstance(changes)
    );
  }

  /** @docs-private */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['ngComponentOutletProps']) {
      this.bindProps = changes['ngComponentOutletProps'].currentValue ?? {};
      this._componentRef?.changeDetectorRef.markForCheck();
    }
    if (this._needToReCreateComponentInstance(changes)) {
      this._viewContainerRef.clear();
      this._componentRef = undefined;
      this._componentInjector = undefined;

      if (this.ngComponentOutlet) {
        const injector = this.ngComponentOutletInjector || this._viewContainerRef.parentInjector;

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

        this._componentRef = this._viewContainerRef.createComponent(this.ngComponentOutlet, {
          injector,
          ngModuleRef: this._moduleRef,
          projectableNodes: this.ngComponentOutletContent,
          environmentInjector: this.ngComponentOutletEnvironmentInjector,
          directives: (this.ngComponentOutletDirectives ?? []).map((directive) => ({
            type: directive,
            bindings: this.getDirectiveBindings(directive),
          })),
          bindings: this.getComponentBindings(this.ngComponentOutlet),
        });
        this._componentInjector = this._componentRef.injector;
      }
    }
  }

  /** @docs-private */
  ngOnDestroy() {
    this._moduleRef?.destroy();
  }

  protected getComponentBindings(component: Type<any>) {
    if (!('ɵcmp' in component)) {
      return [];
    }
    const componentDef = (component as any)['ɵcmp']!;
    const bindings: Binding[] = [];
    Object.keys(componentDef.inputs).forEach((inputKey) => {
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
