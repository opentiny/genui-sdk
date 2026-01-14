# 支持 Angular

GenUI SDK 提供了 Angular 版本的渲染器，可以在 Angular 项目中使用生成式 UI 功能。

## 安装

```bash
npm install @opentiny/genui-sdk-angular
# 或
pnpm add @opentiny/genui-sdk-angular
# 或
yarn add @opentiny/genui-sdk-angular
```

## 基础用法

### 使用 SchemaRenderer

```typescript
// app.component.ts
import { Component } from '@angular/core';
import { SchemaRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SchemaRenderer],
  template: `
    <tiny-schema-renderer
      [schema]="schema"
      [generating]="generating"
      (onAction)="handleAction($event)"
    ></tiny-schema-renderer>
  `,
})
export class AppComponent {
  generating = false;
  schema = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello GenUI!'
        }
      }
    ]
  };

  handleAction(event: { llmFriendlyMessage: string; humanFriendlyMessage: string }) {
    console.log('Action:', event);
  }
}
```

### 使用 Custom Element

GenUI SDK 还提供了 Custom Element 版本，可以在任何框架中使用：

```html
<!-- index.html -->
<script src="path/to/tiny-schema-renderer-element-ng.js"></script>

<tiny-schema-renderer-element-ng
  [schema]="schema"
  [generating]="generating"
></tiny-schema-renderer-element-ng>
```

## 完整示例

### 基础聊天应用

```typescript
// app.component.ts
import { Component, signal } from '@angular/core';
import { SchemaRenderer } from '@opentiny/genui-sdk-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SchemaRenderer],
  template: `
    <div class="app">
      <tiny-schema-renderer
        [schema]="schema()"
        [generating]="generating()"
        (onAction)="handleAction($event)"
      ></tiny-schema-renderer>
    </div>
  `,
  styles: [`
    .app {
      width: 100%;
      height: 100vh;
    }
  `]
})
export class AppComponent {
  generating = signal(false);
  schema = signal<any>({});

  async handleAction(event: { llmFriendlyMessage: string; humanFriendlyMessage: string }) {
    this.generating.set(true);
    
    // 调用后端 API
    const response = await fetch('https://your-chat-backend/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: event.llmFriendlyMessage }),
    });

    // 处理流式返回
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        content += chunk;
        
        // 尝试解析 JSON
        try {
          const json = JSON.parse(content);
          this.schema.set(json);
        } catch {
          // 部分 JSON，继续等待
        }
      }
    }

    this.generating.set(false);
  }
}
```

### 使用自定义组件

```typescript
// app.component.ts
import { Component, signal } from '@angular/core';
import { SchemaRenderer } from '@opentiny/genui-sdk-angular';
import { CustomCardComponent } from './custom-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SchemaRenderer],
  template: `
    <tiny-schema-renderer
      [schema]="schema()"
      [generating]="generating()"
      [customComponents]="customComponents"
      (onAction)="handleAction($event)"
    ></tiny-schema-renderer>
  `,
})
export class AppComponent {
  generating = signal(false);
  schema = signal<any>({});
  
  customComponents = {
    CustomCard: CustomCardComponent
  };

  handleAction(event: any) {
    // 处理动作
  }
}
```

```typescript
// custom-card.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-card">
      <div class="card-header">
        <h3>{{ title }}</h3>
      </div>
      <div class="card-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .custom-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .card-header h3 {
      margin: 0 0 12px 0;
    }
  `]
})
export class CustomCardComponent {
  @Input() title?: string;
}
```

## 配置模块

### 在 AppModule 中配置

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { GenUIModule } from '@opentiny/genui-sdk-angular';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    GenUIModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

### 在 Standalone 组件中使用

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideAnimations } from '@angular/platform-browser/animations';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations()
  ]
});
```

## 样式配置

### 引入基础样式

```typescript
// styles.css
@import '@opentiny/ng-themes/styles.css';
@import '@opentiny/ng-themes/theme-default.css';
```

### 自定义主题

```css
/* styles.css */
:root {
  --genui-primary-color: #1890ff;
  --genui-success-color: #52c41a;
  --genui-warning-color: #faad14;
  --genui-error-color: #f5222d;
}
```

## API 参考

### SchemaRenderer 组件

#### Inputs

- `schema: any` - Schema 对象
- `generating: boolean` - 是否正在生成
- `customComponents?: Record<string, Type<any>>` - 自定义组件映射
- `customActions?: Record<string, any>` - 自定义动作映射
- `requiredCompleteFieldSelectors?: string[]` - 需要完整字段的选择器
- `state?: Record<string, any>` - 全局状态

#### Outputs

- `onAction: EventEmitter<{ llmFriendlyMessage: string; humanFriendlyMessage: string }>` - 动作事件

## 与 Vue 版本的差异

1. **组件导入方式**：Angular 使用模块导入或 standalone 组件
2. **响应式系统**：Angular 使用 Signal 或 RxJS，而不是 Vue 的 ref/reactive
3. **事件处理**：使用 `@Output()` 和 `EventEmitter` 而不是 props
4. **样式作用域**：使用 Angular 的样式封装机制

## 完整项目示例

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations()
  ]
};
```

```typescript
// app.component.ts
import { Component, signal } from '@angular/core';
import { SchemaRenderer } from '@opentiny/genui-sdk-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SchemaRenderer],
  template: `
    <div class="app-container">
      <tiny-schema-renderer
        [schema]="schema()"
        [generating]="generating()"
        [customComponents]="customComponents"
        (onAction)="handleAction($event)"
      ></tiny-schema-renderer>
    </div>
  `,
  styles: [`
    .app-container {
      width: 100%;
      height: 100vh;
      padding: 20px;
    }
  `]
})
export class AppComponent {
  generating = signal(false);
  schema = signal<any>({});
  
  customComponents = {};

  async handleAction(event: { llmFriendlyMessage: string; humanFriendlyMessage: string }) {
    // 处理动作
    console.log('Action:', event);
  }
}
```

## 注意事项

1. **Angular 版本**：确保使用兼容的 Angular 版本（通常需要 Angular 15+）
2. **Zone.js**：某些功能可能需要 Zone.js，确保正确配置
3. **变更检测**：使用 Signal 或 OnPush 策略以获得更好的性能
4. **样式隔离**：注意 Angular 的样式封装机制
5. **依赖注入**：自定义组件可以通过依赖注入访问服务
