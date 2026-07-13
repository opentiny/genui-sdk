# Installation and Configuration

This guide helps you install GenUI SDK for Angular quickly.

## Install dependencies

Go to your project directory and install GenUI SDK:

::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-angular --force # Installs peerDependencies as well
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-angular @opentiny/ng-themes
```
== yarn
```bash
yarn add @opentiny/genui-sdk-angular @opentiny/ng-themes
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

## Next steps

You can now use `GenuiRenderer` to render generative UI. See the [Renderer usage guide](start-with-renderer).

## Related documentation

- See the [Renderer usage guide](start-with-renderer) to learn how to use `GenuiRenderer` with finer control
- See [feature examples](../../examples/angular/renderer/custom-actions) for usage examples
