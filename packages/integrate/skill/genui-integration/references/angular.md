# Angular 集成指南

本指南涵盖将 GenUI SDK 集成到 Angular 项目中的选型与 skill 增量说明。安装与逐步操作见在线文档。

## 安装与配置

- **概况**：安装 `@opentiny/genui-sdk-angular` 与官方物料包；引入 `@opentiny/ng-themes` 样式；配置 `zone.js`、`provideZoneChangeDetection()` 与 `provideAnimations()`；通过 `GenuiConfigProvider` 注入 `materials`。
- **详细步骤**：[安装与配置](https://docs.opentiny.design/genui-sdk/guide/angular/install)

## 集成：GenuiRenderer

- **概况**：Angular 暂无 `GenuiChat`，使用 `GenuiRenderer` 渲染生成式 UI；流式请求须在 `metadata.tinygenui` 中指定 `framework: 'Angular'`，以便后端返回 Angular 兼容 schema。
- **详细步骤**：[使用 Renderer 组件](https://docs.opentiny.design/genui-sdk/guide/angular/start-with-renderer)

## Custom Actions

Define actions that can be triggered from the generated UI. LLM-controlled URLs are untrusted — configure an origin allowlist before opening links.

```typescript
const ALLOWED_NAVIGATION_ORIGINS = [
  'https://opentiny.design',
  'https://docs.opentiny.design',
];

function resolveAllowedNavigationUrl(rawUrl: unknown): URL | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, window.location.origin);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  const sameOrigin = parsed.origin === window.location.origin;
  const allowlisted = ALLOWED_NAVIGATION_ORIGINS.includes(parsed.origin);
  return sameOrigin || allowlisted ? parsed : null;
}

function openAllowedPage(rawUrl: unknown, rawTarget: unknown = '_self'): void {
  const url = resolveAllowedNavigationUrl(rawUrl);
  if (!url) {
    console.warn('[openPage] blocked disallowed navigation target:', rawUrl);
    return;
  }
  const target = rawTarget === '_blank' ? '_blank' : '_self';
  const crossOrigin = url.origin !== window.location.origin;
  if (target === '_blank' || crossOrigin) {
    window.open(url.href, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.assign(url.href);
}

import { Component } from '@angular/core';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials">
      <genui-renderer 
        [content]="schema"
        [customActions]="customActions">
      </genui-renderer>
    </genui-config-provider>
  `,
})
export class GenuiExample {
  materials = materials;
  schema = '';
  
  customActions = {
    'openPage': {
      execute: (params: { url?: string; target?: string }) => {
        openAllowedPage(params.url, params.target);
      },
    },
    'showNotification': {
      execute: (params: any) => {
        console.log('Notification:', params.message);
      },
    },
  };
}
```

## 兼容组件

v1.3.0 起须通过 `GenuiConfigProvider` 注入物料；从更早版本升级且希望零配置迁移时，可使用内置默认物料的 `GenuiLegacyRenderer`。详见 [GenuiRenderer Legacy 兼容说明](https://docs.opentiny.design/genui-sdk/components/angular/renderer#兼容组件-genuilegacyrenderer)。

## 与 Vue 的主要区别

1. **No GenuiChat**: Angular currently only has `GenuiRenderer`, not the integrated `GenuiChat` component
2. **Zone.js Required**: Angular integration requires Zone.js for change detection
3. **Animations Required**: Must provide `provideAnimations()` in app config
4. **Metadata for Framework**: When making requests, include `metadata.tinygenui` with `framework: 'Angular'` to get Angular-compatible schemas
5. **Standalone Components**: Uses Angular's standalone component pattern (Angular 14+)

## 常见问题

### 物料未注入

**问题**: 组件无法正确渲染

**解决方案**: Ensure you've wrapped components with `<genui-config-provider>` and passed materials:

```html
<genui-config-provider [materials]="materials">
  <genui-renderer [content]="schema"></genui-renderer>
</genui-config-provider>
```

### Change Detection Not Working

**问题**: UI 在流式传输期间不更新

**解决方案**: 
1. Make sure Zone.js is installed and configured in `angular.json`
2. Ensure `provideZoneChangeDetection()` is in your app config
3. Use `[(ngModel)]` for two-way binding on inputs

### Animations Not Working

**问题**: Material components don't animate properly

**解决方案**: Add `provideAnimations()` to your app config providers

### Wrong Framework Schema

**问题**: Generated UI doesn't work in Angular

**解决方案**: Include the framework metadata in your API requests:

```typescript
body: JSON.stringify({
  messages: [...],
  model: 'deepseek-v3.2',
  stream: true,
  metadata: {
    tinygenui: JSON.stringify({
      framework: 'Angular',
    }),
  },
})
```

## 下一步

- 了解 [自定义组件](../examples/angular/renderer/custom-components.md)
- 探索 [自定义动作](../examples/angular/renderer/custom-actions.md)
- 配置 [必需完整字段选择器](../examples/angular/renderer/required-complete-field-selectors.md)
- 查看 [状态管理示例](../examples/angular/renderer/state.md)
