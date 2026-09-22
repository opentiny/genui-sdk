# GenuiConfigProvider 组件

`GenuiConfigProvider` 用于为 Angular 渲染器提供物料与自定义 Notify 等配置能力，通过 Angular 依赖注入向下传递。

## Inputs

### id

- **类型**: `string`
- **必填**: 否
- **默认值**: `'tiny-genui-config-provider'`
- **说明**: 容器元素的 id，用于标识配置提供者实例。

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

## 嵌套使用

`GenuiConfigProvider` 支持嵌套。内层未传入 `notify` 时会自动继承父级配置；传入时覆盖父级。

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
