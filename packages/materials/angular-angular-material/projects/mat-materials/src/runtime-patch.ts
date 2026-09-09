import { MatFormField } from '@angular/material/form-field';
import { MatSlider } from '@angular/material/slider';
import { EMPTY } from 'rxjs';

/**
 * 占位 MatFormFieldControl 实现。
 *
 * `MatFormField` 通过 `@ContentChild(MatFormFieldControl)` 获取内部控件，并在
 * `ngAfterContentInit`/`ngAfterContentChecked` 中 assert 控件存在；其编译模板还会
 * 直接访问控件的 15 个成员（如 `id`、`disabled`、`onContainerClick`）。schema 渲染器
 * 是动态创建 content children 的，父组件首次 CD 时子控件尚未实例化，因此必然触发
 * `mat-form-field must contain a MatFormFieldControl.` 错误。
 *
 * 该占位对象提供所有被访问成员的安全默认值，使 form-field 在真实控件被渲染器
 * patch 上来之前保持空壳而不崩溃；真实控件到达后，`MatFormField` 内置的
 * `ngAfterContentChecked` → `_initializeControl` 逻辑会自动完成订阅切换。
 */
const noopControl: any = {
  value: undefined,
  placeholder: '',
  id: '',
  ngControl: undefined,
  focused: false,
  empty: true,
  shouldLabelFloat: false,
  required: false,
  disabled: false,
  errorState: false,
  controlType: 'genui-noop',
  autofilled: false,
  userAriaDescribedBy: undefined,
  disableAutomaticLabeling: false,
  describedByIds: [],
  stateChanges: EMPTY,
  onContainerClick: () => {},
  setDescribedByIds: () => {},
};

let patched = false;
let notchedOutlinePatched = false;

/**
 * 修复 `MatFormFieldNotchedOutline` 的一次性 label 判定。
 *
 * `ngAfterViewInit` 只在初始化时执行一次：notch 内当时没有 `.mdc-floating-label`
 * 就会**永久**添加 `mdc-notched-outline--no-label`（CSS 让 notch `display:none`）。
 * 静态模板下 label 一定已就位，所以没问题；但 schema 渲染器是动态创建内容、
 * 延迟投影 `mat-label` 的 —— 初始化时 label 尚未出现，之后 label 渲染出来了
 * `--no-label` 却不会移除，floating label 就被藏死（用户看不到 label 文本）。
 *
 * Patch 后，当原逻辑落进 `--no-label` 分支时监听 notch 内容变化，一旦
 * `.mdc-floating-label` 出现就移除 `--no-label` 并补上 `--upgraded`（MDC 正常态）。
 * 幂等；`MatFormFieldNotchedOutline` 未从公共 API 导出，从 `ɵcmp.dependencies`
 * 按 selector 解析（Angular 20 编译产物的稳定字段）。
 */
function patchNotchedOutlineClassFix(): void {
  if (notchedOutlinePatched) {
    return;
  }
  notchedOutlinePatched = true;

  const deps = (MatFormField as any)?.ɵcmp?.dependencies;
  if (!Array.isArray(deps)) {
    return;
  }
  const Ctor =
    deps.find((d: any) => {
      if (typeof d !== 'function') {
        return false;
      }
      const selector = String((d as any)?.ɵcmp?.selector ?? (d as any)?.ɵdir?.selector ?? '');
      return selector.includes('matFormFieldNotchedOutline');
    }) ??
    deps.find((d: any) => typeof d === 'function' && /NotchedOutline/.test(d.name ?? ''));
  const proto = Ctor?.prototype;
  if (!proto || typeof proto.ngAfterViewInit !== 'function') {
    return;
  }

  const original = proto.ngAfterViewInit;
  proto.ngAfterViewInit = function (this: any) {
    original.call(this);
    const el = this._elementRef?.nativeElement as HTMLElement | undefined;
    if (!el?.classList) {
      return;
    }
    const upgrade = () => {
      if (!el.querySelector('.mdc-floating-label')) {
        return false;
      }
      el.classList.remove('mdc-notched-outline--no-label');
      el.classList.add('mdc-notched-outline--upgraded');
      return true;
    };
    if (upgrade()) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (upgrade()) {
        observer.disconnect();
      }
    });
    observer.observe(el, { childList: true, subtree: true });
    // 兜底断开，避免动态渲染失败时观察器常驻。
    setTimeout(() => observer.disconnect(), 5000);
  };
}

/**
 * Schema 投影会在 NotchedOutline.ngAfterViewInit 之后才把 `.mdc-floating-label`
 * 放进 notch。原逻辑已写上 `--no-label`（CSS 让 notch `display:none`），之后也不会
 * 再改。每次 content 检查时：notch 里已经有 floating label 就摘掉 `--no-label`。
 */
function upgradeNotchedOutline(host: HTMLElement | null | undefined): void {
  if (!host) {
    return;
  }
  host.querySelectorAll('.mdc-notched-outline.mdc-notched-outline--no-label').forEach((outline) => {
    if (outline.querySelector('.mdc-floating-label')) {
      outline.classList.remove('mdc-notched-outline--no-label');
      outline.classList.add('mdc-notched-outline--upgraded');
    }
  });
}

function patchFormFieldNotchUpgrade(): void {
  const proto = MatFormField?.prototype as any;
  if (!proto || typeof proto.ngAfterContentChecked !== 'function') {
    return;
  }
  const original = proto.ngAfterContentChecked;
  proto.ngAfterContentChecked = function (this: any) {
    original.call(this);
    upgradeNotchedOutline(this._elementRef?.nativeElement as HTMLElement | undefined);
  };
}

/**
 * 覆盖 `MatFormField.prototype._control` getter，在控件缺失时兜底为 noop 占位。
 *
 * 幂等：重复调用安全。返回 `false` 表示未能应用（例如 @angular/material 升级导致
 * 访问器形态变化），此时 form-field 仍会按原逻辑运行。
 */
export function applyMaterialPatch(): boolean {
  if (patched) {
    return true;
  }
  const proto = MatFormField?.prototype;
  if (!proto || typeof Object.getOwnPropertyDescriptor(proto, '_control') !== 'object') {
    return false;
  }
  Object.defineProperty(proto, '_control', {
    configurable: true,
    enumerable: false,
    get(this: any) {
      return this._explicitFormFieldControl || this._formFieldControl || noopControl;
    },
    set(this: any, value: any) {
      this._explicitFormFieldControl = value;
    },
  });
  patchNotchedOutlineClassFix();
  patchFormFieldNotchUpgrade();
  patchMatSliderThumbTiming();
  patched = true;
  return true;
}

/**
 * `MatSlider` 在 ngAfterViewInit 时通过 ContentChild(MAT_SLIDER_THUMB) 校验拇指 input。
 * Schema 渲染器是动态投影子节点的，首次 CD 时查询还是空的，会抛
 * `Invalid slider thumb input configuration`。真实拇指被 patch 上来后再跑一遍原初始化。
 */
let sliderPatched = false;

function patchMatSliderThumbTiming(): void {
  if (sliderPatched) {
    return;
  }
  const proto = MatSlider?.prototype as any;
  if (!proto || typeof proto.ngAfterViewInit !== 'function') {
    return;
  }
  sliderPatched = true;
  const originalInit = proto.ngAfterViewInit;
  proto.ngAfterViewInit = function (this: any) {
    const end = typeof this._getInput === 'function' ? this._getInput(2) : null;
    if (!end) {
      this.__genuiSliderPending = true;
      return;
    }
    originalInit.call(this);
  };
  const originalChecked = proto.ngAfterContentChecked;
  proto.ngAfterContentChecked = function (this: any) {
    originalChecked?.call(this);
    if (!this.__genuiSliderPending) {
      return;
    }
    const end = typeof this._getInput === 'function' ? this._getInput(2) : null;
    if (!end) {
      return;
    }
    this.__genuiSliderPending = false;
    originalInit.call(this);
  };
}
