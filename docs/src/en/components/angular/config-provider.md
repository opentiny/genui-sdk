# GenuiConfigProvider

`GenuiConfigProvider` supplies materials and custom notification handlers to the Angular renderer via Angular dependency injection.

## Inputs

### id

- **Type**: `string`
- **Required**: No
- **Default**: `'tiny-genui-config-provider'`
- **Description**: The id of the host element, used to identify the provider instance.

### materials

- **Type**: `IMaterials`
- **Required**: No (required when using `GenuiRenderer`)
- **Description**: Component materials used by the renderer. Typically passed from a materials package such as `@opentiny/genui-sdk-materials-angular-opentiny-ng`.

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

- **Type**: `NotifyHandler`
- **Required**: No
- **Default**: `undefined`
- **Description**: Custom notification callback. Invoked when a schema `JSFunction` fails to parse or throws at runtime. If omitted, a built-in DOM toast is used.

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
    // Wire your app toast / modal here
    console.log(options.type, options.title, options.message);
  };
}
```

## Nesting

`GenuiConfigProvider` can be nested. When the inner provider does not pass `notify`, it inherits the parent handler; passing `notify` overrides it.

```ts
@Component({
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials" [notify]="parentNotify">
      <!-- Inner provider omits notify, inherits parentNotify -->
      <genui-config-provider [materials]="materials">
        <genui-renderer [content]="schema"></genui-renderer>
      </genui-config-provider>
    </genui-config-provider>
  `,
})
export class GenuiExample {}
```
