# Angular 集成指南

本指南涵盖 将 GenUI SDK 集成到 Angular 项目中.

## 安装

### 新项目 (从零开始)

创建新的 Angular 项目:

```bash
ng new genui-app
cd genui-app
```

### 现有项目

导航到你的现有 Angular 项目:

```bash
cd your-project
```

### 安装依赖

安装 GenUI SDK 和官方物料:

```bash
# npm
npm install @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng --force

# pnpm
pnpm add @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng @opentiny/ng-themes

# yarn
yarn add @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng @opentiny/ng-themes
```

Note: The `--force` flag is needed for npm to install peerDependencies properly.

## 配置 Zone.js and Animations

The built-in material library requires Zone.js change detection and animation library to work properly.

### 步骤 1: Install Zone.js (if not already installed)

```bash
# npm
npm install zone.js

# pnpm
pnpm add zone.js

# yarn
yarn add zone.js
```

### 步骤 2: 配置 angular.json

Add zone.js to polyfills in `angular.json`:

```json
{
  "projects": {
    "your-project-name": {
      "projectType": "application",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "polyfills": ["zone.js"]
          }
        }
      }
    }
  }
}
```

### 步骤 3: 配置 App Config

Update `app.config.ts` to provide animations and zone change detection:

```typescript
import { provideAnimations } from '@angular/platform-browser/animations';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
  ]
};
```

## Import Styles

Add required theme styles to your `style.css`:

```css
@import '@opentiny/ng-themes/styles.css';
@import '@opentiny/ng-themes/theme-默认.css';
```

## Integration: GenuiRenderer

Angular uses `GenuiRenderer` for rendering generative UI. There is no `GenuiChat` component in Angular yet.

### 步骤 1: 创建流式处理器

创建文件 `fetch-schema-stream.ts` 来处理流式响应:

```typescript
import { PatternExtractor } from '@opentiny/genui-sdk-core';

export async function fetchSchemaStream(
  url: string,
  userInput: string,
  onSchemaUpdate: (schemaChunk: string) => void,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: userInput }],
      model: 'deepseek-v3.2',
      stream: true,
      metadata: {
        tinygenui: JSON.stringify({
          framework: 'Angular',
        }),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const patternExtractor = new PatternExtractor({
    onNormalWrite: () => {},
    onHandledWrite: (value) => onSchemaUpdate(value),
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEndIndex = buffer.indexOf('\n');
        if (lineEndIndex === -1) break;

        const line = buffer.slice(0, lineEndIndex).trim();
        buffer = buffer.slice(lineEndIndex + 1);

        if (!line.startsWith('data: ')) continue;

        const dataStr = line.slice(6);

        if (dataStr === '[DONE]') {
          return;
        }

        try {
          const chunk = JSON.parse(dataStr);
          const content = chunk.choices?.[0]?.delta?.content;

          if (!content) continue;

          patternExtractor.handleContent(content);
        } catch (e) {
          console.error('解析后端数据失败:', e, dataStr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

Note the `metadata.tinygenui` field with `framework: 'Angular'` - this tells the backend to generate Angular-compatible schemas.

### 步骤 2: 创建组件

Create a component with input, send button, and renderer:

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { fetchSchemaStream } from '../fetch-schema-stream';

@Component({
  selector: 'genui-example',
  imports: [FormsModule, GenuiConfigProvider, GenuiRenderer],
  template: `
  <div class="demo-container">
    <div class="input-group">
      <input [(ngModel)]="inputText" type="text" placeholder="请输入问题..." (keyup.enter)="handleSend()" />
      <button (click)="handleSend()">发送</button>
    </div>
    <genui-config-provider [materials]="activeMaterials">
      <genui-renderer [content]="schema"> </genui-renderer>
    </genui-config-provider>
  </div>
  `,
  styles: [`
.demo-container {
  padding: 16px;
  box-sizing: border-box;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
  `],
})
export class GenuiExample {
  inputText = '';
  schema = '';
  generating = false;
  protected readonly activeMaterials = materials;

  async handleSend() {
    if (!this.inputText.trim() || this.generating) return;

    this.generating = true;
    this.schema = '';
    const userInput = this.inputText;
    this.inputText = '';

    try {
      await fetchSchemaStream('https://your-chat-backend/api', userInput, (schemaChunk: string) => {
        this.schema += schemaChunk;
      });
    } catch (error) {
      console.error('请求失败:', error);
    } finally {
      this.generating = false;
    }
  }
}
```

### 步骤 3: Basic Usage Without Streaming

For a simpler setup without streaming, you can directly pass schema content:

```typescript
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
  schema = {
    componentName: 'Page',
    children: [
      {
        componentName: 'TinyButton',
        props: { text: '提交', type: 'primary' },
      },
    ],
  };
}
```

## Material 配置

`GenuiRenderer` no longer includes built-in component materials. You need to inject materials via `GenuiConfigProvider`. This decouples the SDK core from specific UI materials, allowing you to replace or extend the component library as needed.

```typescript
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

## Custom Components

Extend the renderer with your own Angular components:

```typescript
import { Component } from '@angular/core';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { MyCustomComponent } from './my-custom.component';

@Component({
  imports: [GenuiConfigProvider, GenuiRenderer, MyCustomComponent],
  template: `
    <genui-config-provider [materials]="materials">
      <genui-renderer 
        [content]="schema"
        [customComponents]="customComponents">
      </genui-renderer>
    </genui-config-provider>
  `,
})
export class GenuiExample {
  materials = materials;
  schema = '';
  
  customComponents = {
    'MyCustomComponent': MyCustomComponent,
  };
}
```

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

For projects upgrading from versions before 1.3.0, you can use `GenuiLegacyRenderer` which includes built-in materials:

```typescript
import { Component } from '@angular/core';
import { GenuiLegacyRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiLegacyRenderer],
  template: `
    <genui-legacy-renderer [content]="schema"></genui-legacy-renderer>
  `,
})
export class GenuiExample {
  schema = {
    componentName: 'Page',
    children: [
      {
        componentName: 'TinyButton',
        props: { text: '提交', type: 'primary' },
      },
    ],
  };
}
```

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
