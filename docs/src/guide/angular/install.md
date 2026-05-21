# 安装与配置

本文将帮助你快安装 GenUI SDK Angular

## 安装依赖

进入项目目录并安装 GenUI SDK：
::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-angular --force # 同步安装peerDependencies
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

## 引入样式

### 修改 `style.css`

引入物料所需要的主题文件

```css
@import '@opentiny/ng-themes/styles.css';
@import '@opentiny/ng-themes/theme-default.css';
```

## 引入 Zone 和 Animation

当前内置的物料库需要Zone变更检测和动画库才能正常运作

### 安装 zone.js

进入项目目录并安装 zone.js：

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
如果工程已经安装Zone.js， 可以跳过这一步。

### 修改 `angular.json`

添加 zone.js 到 polyfill 文件中

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
如果工程已经项目已经配置Zone.js， 可以跳过这一步。

### 修改 `app.config.ts`

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

## 下一步

下一步即可使用 GenuiRenderer 对 生成式UI进行渲染， 清参考 [Renderer 使用指南](start-with-renderer)

## 其他相关文档

- 查看 [Renderer 使用指南](start-with-renderer) 了解如何使用 `GenuiRenderer` 进行更精细的控制
- 查看 [特性示例](../../examples/angular/renderer/custom-actions) 学习用法示例
