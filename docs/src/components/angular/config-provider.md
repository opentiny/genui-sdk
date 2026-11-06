# GenuiConfigProvider 组件

`GenuiConfigProvider` 用于为 Angular 渲染器提供物料与自定义 Notify 等配置能力，通过 Angular 依赖注入向下传递。

## Inputs

### id

- **类型**: `string`
- **必填**: 否
- **默认值**: `'tiny-genui-config-provider'`
- **说明**: 容器元素的 id，用于标识配置提供者实例。

### theme

- **类型**: `string`
- **必填**: 否
- **默认值**: `undefined`（不主动调用 runtime）
- **说明**: 主题标识。传入后会与 `locale` 一起交给物料声明的 `runtimeFactory`，由其 `apply()` 执行主题切换；同时会把系统深浅色（`prefers-color-scheme`）作为 `systemColorScheme` 传入。Angular 物料目前不处理主题。

### locale

- **类型**: `string`
- **必填**: 否
- **默认值**: `undefined`（不主动调用 runtime）
- **说明**: 语言标识，使用 `language_REGION` 形式，例如 `zh_CN`、`en_US`。传入后由 `runtimeFactory` 的 `apply()` 切换物料语言，例如 Angular OpenTiny NG 会调用 `TiLocale.setLocale`。`theme` 和 `locale` 都不传时不会调用 runtime，避免嵌套 ConfigProvider 覆盖外层配置。

> TinyNG 的 locale 是全局设置，已挂载组件不会自动响应；切换语言时需要重建渲染内容（playground 的 Angular CE 通过重挂载处理）。

```ts
@Component({
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials" locale="en_US" theme="light">
      <genui-renderer [content]="schema"></genui-renderer>
    </genui-config-provider>
  `,
})
export class GenuiExample {
  materials = materials;
  schema = '';
}
```

### materials

- **类型**: `IMaterials`
- **必填**: 否（使用 `GenuiRenderer` 时需要配置）
- **说明**: 渲染器使用的组件物料。通常传入物料包，例如 `@opentiny/genui-sdk-materials-angular-opentiny-ng` 提供的 `materials` 对象。

```ts
import { Component } from '@angular/core';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials">
      <genui-renderer [content]="schema"></genui-renderer>
    </genui-config-provider>
  `,
})
export class GenuiExample {
  materials = materials;
  schema = '';
}
```

### notify

- **类型**: `NotifyHandler`
- **必填**: 否
- **默认值**: `undefined`
- **说明**: 自定义渲染器通知回调。Schema 中 `JSFunction` 解析失败或执行报错时会调用该函数；未配置时使用内置 DOM toast。

```ts
export type NotifyHandler = (options: {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  duration?: number;
}) => void;
```

```ts
import { Component } from '@angular/core';
import {
  GenuiConfigProvider,
  GenuiRenderer,
  type NotifyHandler,
} from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials" [notify]="notify">
      <genui-renderer [content]="schema"></genui-renderer>
    </genui-config-provider>
  `,
})
export class GenuiExample {
  materials = materials;
  schema = '';

  notify: NotifyHandler = (options) => {
    // 接入业务侧消息组件，例如 TiModal / 自研 toast
    console.log(options.type, options.title, options.message);
  };
}
```

## 运行时 root

`runtimeFactory.apply()` 除了主题和 locale，还可以返回 `root`。Angular 版对 root 的要求：

- **必须是 Angular 组件类**（带 `ɵcmp`）；
- 组件模板里要有一个默认的 `<ng-content>`，用来承接下一层 root 或 ConfigProvider 的内容；
- root 需要是 standalone，或者已经在当前注入器的作用域里，否则依赖解析不到；
- 多个物料运行时返回的 root 会按 `materials` 合并顺序嵌套，第一个 root 在最外层；
- root 引用不变时不会重建；root 变化时会销毁旧 root 并重新嵌套；
- 非 Angular root 会被忽略，并在控制台输出警告。

当前 Angular OpenTiny NG 物料**不返回 root**，只处理全局 locale；其他物料返回 Angular root 后会自动生效。

## 嵌套使用

`GenuiConfigProvider` 支持嵌套。内层未传入 `materials` / `notify` 时会自动继承父级配置；传入时覆盖父级。`theme` / `locale` 只有显式传入时才会调用 runtime，因此内层可以单独覆盖语言或主题。

```ts
@Component({
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials" [notify]="parentNotify">
      <!-- 内层未传 notify，继承 parentNotify -->
      <genui-config-provider [materials]="materials">
        <genui-renderer [content]="schema"></genui-renderer>
      </genui-config-provider>
    </genui-config-provider>
  `,
})
export class GenuiExample {}
```
