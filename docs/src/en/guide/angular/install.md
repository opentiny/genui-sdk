# Installation and Configuration

This guide helps you install GenUI SDK for Angular quickly.

## Install dependencies

Go to your project directory and install GenUI SDK and the official materials package:

::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng --force # Installs peerDependencies as well
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng @opentiny/ng-themes
```
== yarn
```bash
yarn add @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng @opentiny/ng-themes
```
:::

## Import styles

### Update `style.css`

Import the theme files required by the component library:

```css
@import '@opentiny/ng-themes/styles.css';
@import '@opentiny/ng-themes/theme-default.css';
```

## Enable Zone and Animations

The built-in component library requires Zone change detection and the animations module to work correctly.

### Install zone.js

Go to your project directory and install `zone.js`:

::: tabs
== npm
```bash
npm install zone.js
```
== pnpm
```bash
pnpm add zone.js
```
== yarn
```bash
yarn add zone.js
```
:::

If your project already has Zone.js installed, you can skip this step.

### Update `angular.json`

Add `zone.js` to the polyfills array:

```json
{
  // ...
  "projects": {
    "your-project-name": {
      "projectType": "application",
      // ...
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            // ...
            "polyfills": ["zone.js"] // [!code ++]
          },
          // ...
        },
        // ....        
      }
    },
    // other projects
  }
}

```

If your project already configures Zone.js, you can skip this step.

### Update `app.config.ts`

```ts
// ...
import { provideAnimations } from '@angular/platform-browser/animations'; // [!code ++]
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }), // [!code ++]
    provideAnimations(), // [!code ++]
  ]
};

```

## Materials configuration

`GenuiRenderer` no longer ships built-in materials. Inject them via `GenuiConfigProvider`'s `materials` prop so the SDK core stays decoupled from a specific component library.

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

## Custom notify

When a schema `JSFunction` fails to parse or throws at runtime, pass `notify` on `GenuiConfigProvider` to use your app's notification UI. If omitted, the built-in DOM toast is used.

See the [GenuiConfigProvider documentation](../../components/angular/config-provider#notify) for details.

::: tip GenuiLegacyRenderer
For drop-in compatibility without configuring materials, see [GenuiRenderer Legacy compatibility](../../components/angular/renderer#compatibility-component-genuilegacyrenderer).
:::

## Next steps

You can now use `GenuiRenderer` to render generative UI. See the [Renderer usage guide](start-with-renderer).

## Related documentation

- See the [Renderer usage guide](start-with-renderer) to learn how to use `GenuiRenderer` with finer control
- See [feature examples](../../examples/angular/renderer/custom-actions) for usage examples
