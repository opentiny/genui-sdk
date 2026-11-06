# GenuiConfigProvider

`GenuiConfigProvider` supplies materials and custom notification handlers to the Angular renderer via Angular dependency injection.

## Inputs

### id

- **Type**: `string`
- **Required**: No
- **Default**: `'tiny-genui-config-provider'`
- **Description**: The id of the host element, used to identify the provider instance.

### theme

- **Type**: `string`
- **Required**: No
- **Default**: `undefined` (runtime is not invoked)
- **Description**: Theme identifier. When provided, it is passed to the materials `runtimeFactory` together with `locale`, and its `apply()` performs the switch. Angular materials do not handle themes yet.

### locale

- **Type**: `string`
- **Required**: No
- **Default**: `undefined` (runtime is not invoked)
- **Description**: Locale identifier in `language_REGION` form, such as `zh_CN` or `en_US`. When provided, `runtimeFactory.apply()` switches the materials locale; Angular OpenTiny NG calls `TiLocale.setLocale`. If neither `theme` nor `locale` is provided, the runtime is not invoked, so nested ConfigProviders do not override outer settings.

> TinyNG locale is global. Already-mounted components do not react automatically; recreate the rendered content when switching locales (the playground's Angular CE remounts).

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

## Runtime root

`runtimeFactory.apply()` can return a `root` in addition to the resolved theme and locale. In Angular:

- **It must be an Angular component class** (with `ɵcmp`);
- Its template must contain a default `<ng-content>` for the next root or the ConfigProvider content;
- The root must be standalone, or already available in the current injector scope, otherwise its dependencies cannot be resolved;
- Roots from multiple runtime factories are nested in `materials` merge order, with the first root outermost;
- An unchanged root reference is not recreated; a changed root destroys the old tree and nests again;
- Non-Angular roots are ignored with a console warning.

The current Angular OpenTiny NG materials **do not return a root** and only handle global locale. Other materials that return an Angular root will work automatically.

## Nesting

`GenuiConfigProvider` can be nested. When the inner provider does not pass `materials` / `notify`, it inherits the parent configuration; passing them overrides it. `theme` / `locale` only invoke the runtime when explicitly provided, so an inner provider can override the locale or theme on its own.

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
