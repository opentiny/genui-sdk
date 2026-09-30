# Angular 集成指南

本指南涵盖将 GenUI SDK 集成到 Angular 项目中的选型与 skill 增量说明。安装与逐步操作见在线文档。

## 支持的 Angular 版本

- **官方支持范围**：Angular **20.3.x**（与 `@opentiny/genui-sdk-angular` peer 依赖 `^20.3.0` 一致）
- **Angular 21+**：peer 依赖尚未覆盖该主版本；若强行升级，官方物料与 schema renderer 均未验证 zoneless / 原生动画路径，**不推荐**

## 安装与配置

- **SDK 包**：安装 `@opentiny/genui-sdk-angular` 与官方物料包 `@opentiny/genui-sdk-materials-angular-opentiny-ng`；引入 `@opentiny/ng-themes` 样式；通过 `GenuiConfigProvider` 注入 `materials`
- **运行时前置（使用官方 OpenTiny NG 物料时）**：`zone.js`、`provideZoneChangeDetection()`、`provideAnimations()` — 归因于 `@opentiny/ng` 物料库，而非 Angular 集成的通用要求
- **详细步骤**：[安装与配置](https://docs.opentiny.design/genui-sdk/guide/angular/install)

## Angular 21+ 说明

Angular 21 起框架推荐 zoneless 变更检测，并以 `animate.enter` / `animate.leave` 逐步替代 legacy `@angular/animations`。**当前 GenUI 官方集成路径不支持该方案**：

- 官方物料 `@opentiny/ng` 仍依赖 Zone.js 与 legacy `provideAnimations()`
- schema renderer 流式更新通过 `NgZone.run()` 触发变更检测，zoneless 路径未验证

在 `@opentiny/ng` 完成 zoneless / 原生动画迁移前，即使项目使用 Angular 21，也应继续按 [安装文档](https://docs.opentiny.design/genui-sdk/guide/angular/install) 的 legacy 配置（Zone.js + `provideAnimations()`）。**不要**用 `animate.enter` / `animate.leave` 或 zoneless provider 替代当前物料所需的 legacy 动画与变更检测配置。

若使用自定义物料且完全不依赖 `@opentiny/ng`，Zone / Animation 要求可能减轻；但 GenUI renderer 的流式更新路径在 zoneless 下仍为**实验性、非官方支持**。

## 集成：GenuiRenderer

- **概况**：Angular 暂无 `GenuiChat`，使用 `GenuiRenderer` 渲染生成式 UI；流式请求须在 `metadata.tinygenui` 中指定 `framework: 'Angular'`，以便后端返回 Angular 兼容 schema。
- **详细步骤**：[使用 Renderer 组件](https://docs.opentiny.design/genui-sdk/guide/angular/start-with-renderer)

## 自定义动作

定义可由生成式 UI 触发的动作。LLM 控制的 URL 不可信——打开链接前须配置 origin 白名单。

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

1. **无 GenuiChat**：Angular 目前仅有 `GenuiRenderer`，没有集成式 `GenuiChat` 组件
2. **Zone.js（官方物料）**: 使用官方 OpenTiny NG 物料时需要 Zone.js 变更检测
3. **Animations（官方物料）**: 使用官方物料时须在 app config 中提供 legacy `provideAnimations()`
4. **框架 Metadata**：发起请求时须在 `metadata.tinygenui` 中指定 `framework: 'Angular'`，以获取 Angular 兼容的 schema
5. **Standalone Components**: 使用 Standalone 组件模式；目标 Angular **20.3.x**

## 常见问题

### 物料未注入

**问题**: 组件无法正确渲染

**解决方案**: 确保已用 `<genui-config-provider>` 包装组件并传入物料：

```html
<genui-config-provider [materials]="materials">
  <genui-renderer [content]="schema"></genui-renderer>
</genui-config-provider>
```

### 变更检测不生效

**问题**: UI 在流式传输期间不更新

**适用范围**：以下排查针对**使用官方 OpenTiny NG 物料**的场景。

**解决方案**: 
1. 确认已安装并在 `angular.json` 中配置 Zone.js
2. 确认 app config 中包含 `provideZoneChangeDetection()`
3. 输入控件使用 `[(ngModel)]` 双向绑定

### 动画不生效

**问题**: 物料组件动画表现异常

**适用范围**：以下排查针对**使用官方 OpenTiny NG 物料**的场景。

**解决方案**: 在 app config providers 中添加 legacy `provideAnimations()`。Angular 21+ 的 `animate.enter` / `animate.leave` **不能替代**当前官方物料所需的 legacy 动画 provider。

### 框架 Schema 不正确

**问题**: 生成的 UI 在 Angular 中无法正常工作

**解决方案**: 在 API 请求中加入 framework metadata：

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
