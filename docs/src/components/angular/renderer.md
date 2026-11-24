# GenuiRenderer 组件

`GenuiRenderer` 是 GenUI SDK 的核心渲染组件（Renderer），用于将大模型返回的结构化 JSON Schema 渲染为可交互的 UI 界面。

::: warning 物料配置
`GenuiRenderer` 本身不包含 UI 物料，需配合 `GenuiConfigProvider` 的 `materials` 使用，详见 [安装与配置](../../guide/angular/install#物料配置)。

若需保持旧版「开箱即用」行为，请改用 `GenuiLegacyRenderer`，Input 与内容投影与 `GenuiRenderer` 完全一致。
:::

## 兼容组件 GenuiLegacyRenderer

`GenuiLegacyRenderer` 内置 OpenTiny NG 默认物料，适用于未配置 `GenuiConfigProvider` 的旧项目迁移，无需额外安装物料包。

```ts
import { Component } from '@angular/core';
import { GenuiLegacyRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiLegacyRenderer],
  template: `
    <genui-legacy-renderer [content]="schemaContent"></genui-legacy-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'TiButton',
        props: { color: 'primary' },
        children: [{ componentName: 'Text', props: { text: '提交' } }],
      },
    ],
  };
}
```

## Input

### content

- **类型**: `string | object`
- **必填**: 是
- **说明**: Schema 内容，可以是字符串或对象。当传入字符串时，组件会尝试解析"部分 JSON"并自动补全，支持流式更新。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
        },
      },
    ],
  };
}
```

### isJsonComplete

- **类型**: `boolean`
- **必填**: 否
- **说明**: 仅当content类型为json对象时生效，标记当前json是否完整，用于辅助缓冲判断是否值完整。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [isJsonComplete]="isJsonComplete"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
          style: 'color:'
        },
      },
    ],
  };
  isJsonComplete = false;
}
```

### generating

- **类型**: `boolean`
- **必填**: 否
- **说明**: 标记当前对话是否正在生成中。用于控制 UI 的加载状态。

```ts

import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="content" [generating]="isGenerating"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
        },
      },
    ],
  };
  isGenerating = true;
}
```

### customComponents

- **类型**: `Record<string, Type<any>>`
- **必填**: 否
- **说明**: 自定义组件映射表，用于扩展可用的组件列表。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { MyCustomComponent } from './my-custom-component';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [customComponents]="customComponents"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'MyCustomComponent',
        props: {
          foo: 'bar',
        },
      },
    ],
  };
  customComponents = {
    MyCustomComponent: MyCustomComponent,
    // 。。。
  };
}
```

#### 说明

- 如果使用非 `standalone` 组件，需要搭配 `customComponentsModule` 使用。
- 组件相关描述信息需要在调用接口时传给后台服务，大模型才能据此生成该组件的协议 JSON 数据。
- `@ContentChild` / `@ContentChildren` 查询通过运行时补丁实现支持（best-effort），可解析动态创建组件上的 `QueryList` 与 `contentChild()` / `contentChildren()` 信号，并按 schema 声明顺序返回结果；部分基于类型/复杂选择器的查询谓词可能无法完全还原，存在边界情况。
- 投影 `ng-content` 内容当前仅支持静态投影，并支持 `select` 选择器内容选择投影；对于惰性投影目前无法良好支持

### customComponentsModule

- **类型**: `Record<string, Type<any>>`
- **必填**: 否
- **说明**: 自定义组件归属模块映射表，用于扩展非`standalone`组件需要配置模块映射列表。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { MyCustomModule, MyCustomComponent } from './my-custom-module';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [customComponents]="customComponents" [customComponentsModule]="customComponentsModule"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'MyCustomComponent',
        props: {
          foo: 'bar',
        },
      },
    ],
  };
  customComponents = {
    MyCustomComponent: MyCustomComponent,
    // 。。。
  };
  customComponentsModule = {
    MyCustomComponent: MyCustomModule,
    // 。。。
  }
}
```

### customDirectives

- **类型**: `Record<string, Type<any>>`
- **必填**: 否
- **说明**: 自定义指令映射表，用于扩展可用的指令列表。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { MyCustomDirective } from './my-custom-directive';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [customDirectives]="customDirectives"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'div',
        directives: [
          {
            directiveName: 'MyCustomDirective'
          }
        ]
      },
    ],
  };
  customDirectives = {
    MyCustomDirective: MyCustomDirective,
    // 。。。
  };
}
```
⚠️ 限制说明： 受限于 `ViewContainerRef.createComponent` API，目前只支持 `standalone` 的指令
非 `standalone` 指令需要额外登记其声明所在的 `NgModule`（通过 `customDirectivesModule` 输入或全局 `directiveModuleRef`），渲染器据此创建模块并为指令提供 DI 依赖，并将指令标记为 `standalone`。


### customDirectivesModule

- **类型**: `Record<string, Type<any>>`
- **必填**: 否
- **说明**: 非 `standalone` 指令到其声明 `NgModule` 的映射表。渲染器通过 `createNgModule` 创建对应模块，为指令提供模块级 DI 依赖。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { MyCustomDirective, MyCustomDirectiveModule } from './my-custom-directive';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [customDirectives]="customDirectives" [customDirectivesModule]="customDirectivesModule"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'div',
        directives: [{ directiveName: 'MyCustomDirective' }],
      },
    ],
  };
  customDirectives = {
    MyCustomDirective: MyCustomDirective,
  };
  customDirectivesModule = {
    MyCustomDirective: MyCustomDirectiveModule,
  };
}
```

### customActions

- **类型**: `Record<string, { execute: (params: any, context: any) => void }>`
- **必填**: 否
- **说明**: 自定义动作映射表，用于定义可在组件中调用的动作。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [customActions]="customActions"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
          onClick: {
            type: 'JSFunction',
            value: 'function() { this.callAction(\'showNotification\', { message: \'用户点击了 HelloWorld\'})}'
          }
        },
      },
    ],
  };
  customActions = {
    openPage: {
      execute: (params, context) => {
        window.open(params.url, params.target || '_self');
      },
    },
    showNotification: {
      execute: (params, context) => {
        console.log('通知:', params.message);
      },
    },
  };
}

```


查看 [Renderer 自定义 Actions](../../examples/angular/renderer/custom-actions) 了解详细用法

### requiredCompleteFieldSelectors

- **类型**: `string[]`
- **必填**: 否
- **说明**: 指定哪些字段路径需要完整后才能更新。用于控制流式更新时的缓冲策略。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [requiredCompleteFieldSelectors]="requiredCompleteFieldSelectors"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
          onClick: {
            type: 'JSFunction',
            value: 'function() { this.callAction(\'showNotification\', { message: \'用户点击了 HelloWorld\'})}'
          }
        },
      },
    ],
  };

  requiredCompleteFieldSelectors = [
    '[componentName=Text] > props > onClick'
  ];
}
```

查看 [Renderer 配置缓冲字段](../../examples/angular/renderer/required-complete-field-selectors) 了解详细用法

## Properties

### rendererInstance

- **类型**: `RendererMain | null`
- **说明**: 底层渲染器实例，复杂场景可以直接调用其 API（如 `getContext`、`setContext`）。组件实例上已有的 `instance` 属性指向同一实例。

## Methods

通过模板引用（`@ViewChild`）可以访问 `GenuiRenderer` 暴露的方法，用于在渲染器外部读写状态。

### setState

- **类型**: `(state?: Record<string, any>) => void`
- **说明**: 设置渲染器的全局状态，与已有状态浅层合并，未传入的字段会保留。直接透传给底层渲染器，不做缓存：流式生成过程中 schema 每次更新都会用 schema 里的 state 重置状态，需要保留的状态请在 schema 更新后重新调用 `setState`。

```ts
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" />
  `,
})
export class GenuiExample implements AfterViewInit {
  @ViewChild(GenuiRenderer) renderer!: GenuiRenderer;

  schemaContent = {
    componentName: 'Page',
    state: {
      userId: null,
      userName: ''
    },
    children: [
      {
        componentName: 'Text',
        props: {
          text: {
            type: 'JSExpression',
            value: 'this.state.userName'
          }
        },
      },
    ],
  };

  // 视图初始化完成后注入状态，此时渲染器实例已就绪
  ngAfterViewInit() {
    this.renderer.setState({ userId: 123, userName: 'John' });
  }
}
```

查看 [Renderer 传递合并 State](../../examples/angular/renderer/state) 了解详细用法

### getState

- **类型**: `() => Record<string, any>`
- **说明**: 获取渲染器当前的全局状态（即渲染器 context 中的 `state`）。

## Template

### header

- **上下文**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **说明**: 自定义渲染器头部内容

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [
    CommonModule,
    GenuiRenderer
  ],
  template: `
    <genui-renderer [content]="schemaContent">
      <ng-template #header let-schema="schema" let-isError="isError" let-isFinished="isFinished">
        <span *ngIf="!isFinished"> 生成中 …… </span>
        <span *ngIf="isError"> 出错了！</span>
        <span>卡片标题：{{ schema.componentName }}</span>
      </ng-template>
    </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
        },
      },
    ],
  };
}
```

### footer

- **参数**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **说明**: 自定义渲染器底部内容

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [
    CommonModule,
    GenuiRenderer
  ],
  template: `
    <genui-renderer [content]="schemaContent">
      <ng-template #footer let-schema="schema">
        <button (click)="handlePrint(schema)">打印schema</button>
      </ng-template>
    </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
        },
      },
    ],
  };
  handlePrint(schema: any) {
    console.log(schema);
  }
}
```


