# GenuiRenderer 组件

`GenuiRenderer` 是 GenUI SDK 的核心渲染组件（Renderer），用于将大模型返回的结构化 JSON Schema 渲染为可交互的 UI 界面。

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

- 如果使用非`standalone`组件需要搭配`customComponentsModule`使用.
- 组件相关描述信息需要调用接口时候传给后台服务，大模型能配套僧成该组件的协议JSON数据
- ⚠️ 限制：动态渲染技术目前不支持使用`@ContentChild`、`@ContentChildren`查询的组件


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
- **说明**: 自定义指令归属模块映射表，用于扩展指令列表。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { MyCustomDirective } from './my-custom-directive';

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
    <genui-renderer [content]="schemaContent" [customActions]="customAction"> </genui-renderer>
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
      execute: (params，context) => {
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

### state

- **类型**: `Record<string, any>`
- **必填**: 否
- **说明**: 传递给渲染器的全局状态，可以在组件中通过上下文访问。

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [state]="state"> </genui-renderer>
  `,
})
export class GenuiExample {
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

  // 从某种历史记录恢复
  state = this.getFromCache();
  getFromCache() {
    return {
      userId: 123,
      userName: 'John'
    }
  }
}

```

查看 [Renderer 传递合并 State](../../examples/angular/renderer/state) 了解详细用法

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
      <ng-template #header let-schema="schema" let-isError="isError" let-generating=“generating”>
        <span *ngIf="“generating”"> 生成中 …… </span>
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

查看 [Renderer 插槽](../../examples/angular/renderer/template) 了解详细用法


