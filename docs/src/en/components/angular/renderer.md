# GenuiRenderer Component

`GenuiRenderer` is the core rendering component (Renderer) of GenUI SDK. It renders structured JSON Schema returned by large language models into interactive UI.

::: warning Materials required
`GenuiRenderer` does not include UI materials. Use it with `GenuiConfigProvider`'s `materials` prop. See [Installation](../../guide/angular/install#materials-configuration).

For the previous out-of-the-box behavior, use `GenuiLegacyRenderer` instead. Its inputs and content projection are identical to `GenuiRenderer`.
:::

## Compatibility Component: GenuiLegacyRenderer

`GenuiLegacyRenderer` bundles OpenTiny NG default materials. Use it when migrating old projects that did not configure `GenuiConfigProvider`. No extra materials package is required.

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
        children: [{ componentName: 'Text', props: { text: 'Submit' } }],
      },
    ],
  };
}
```

## Input

### content

- **Type**: `string | object`
- **Required**: Yes
- **Description**: Schema content as a string or object. When a string is passed, the component attempts to parse "partial JSON" and auto-complete it, supporting streaming updates.

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

- **Type**: `boolean`
- **Required**: No
- **Description**: Applies only when `content` is a JSON object. Marks whether the current JSON is complete, helping the buffer logic determine whether values are complete.

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

- **Type**: `boolean`
- **Required**: No
- **Description**: Indicates whether the current conversation is still generating. Used to control UI loading state.

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

- **Type**: `Record<string, Type<any>>`
- **Required**: No
- **Description**: Custom component map for extending the available component list.

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
    // ...
  };
}
```

#### Notes

- Non-`standalone` components must be used together with `customComponentsModule`.
- Component metadata must be sent to the backend service when calling the API so the model can generate matching protocol JSON for the component.
- `@ContentChild` / `@ContentChildren` queries are supported via a best-effort runtime patch: it resolves `QueryList` and `contentChild()` / `contentChildren()` signals on dynamically created components, returning results in schema declaration order. Some type-based or complex selector predicates may not be fully recoverable, leaving edge cases.
- Projected `ng-content` content currently supports only static projection, including content selection via the `select` selector; lazy projection is not yet well supported.


### customComponentsModule

- **Type**: `Record<string, Type<any>>`
- **Required**: No
- **Description**: Module map for custom components. Required when using non-`standalone` components.

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
    // ...
  };
  customComponentsModule = {
    MyCustomComponent: MyCustomModule,
    // ...
  }
}
```

### customDirectives

- **Type**: `Record<string, Type<any>>`
- **Required**: No
- **Description**: Directive map for extending the available directive list.

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
    // ...
  };
}
```

⚠️ Limitation: Due to the `ViewContainerRef.createComponent` API, only `standalone` directives are currently supported.
Non-`standalone` directives require registering their declaring `NgModule` (via the `customDirectivesModule` input or the global `directiveModuleRef`) so the renderer can create the module and provide DI dependencies for the directive, and marking the directive as `standalone`.

### customDirectivesModule

- **Type**: `Record<string, Type<any>>`
- **Required**: No
- **Description**: Map from non-`standalone` directive names to their declaring `NgModule`. The renderer creates the module via `createNgModule` to provide module-level DI dependencies for the directive.

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

- **Type**: `Record<string, { execute: (params: any, context: any) => void }>`
- **Required**: No
- **Description**: Custom action map defining actions that can be invoked from components.

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
            value: 'function() { this.callAction(\'showNotification\', { message: \'User clicked HelloWorld\'})}'
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
        console.log('Notification:', params.message);
      },
    },
  };
}

```


See [Renderer - Custom Actions](../../examples/angular/renderer/custom-actions) for detailed usage.

### requiredCompleteFieldSelectors

- **Type**: `string[]`
- **Required**: No
- **Description**: Specifies which field paths must be complete before updates are applied. Used to control buffering strategy during streaming updates.

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
            value: 'function() { this.callAction(\'showNotification\', { message: \'User clicked HelloWorld\'})}'
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

See [Renderer - Buffer Field Configuration](../../examples/angular/renderer/required-complete-field-selectors) for detailed usage.

### state

- **Type**: `Record<string, any>`
- **Required**: No
- **Description**: Global state passed to the renderer, accessible in components via context.

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

  // Restore from some history record
  state = this.getFromCache();
  getFromCache() {
    return {
      userId: 123,
      userName: 'John'
    }
  }
}

```

See [Renderer - Passing and Merging State](../../examples/angular/renderer/state) for detailed usage.

## Template

### header

- **Context**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **Description**: Custom renderer header content

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
        <span *ngIf="!isFinished"> Generating... </span>
        <span *ngIf="isError"> Error! </span>
        <span>Card title: {{ schema.componentName }}</span>
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

- **Parameters**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **Description**: Custom renderer footer content

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
        <button (click)="handlePrint(schema)">Print schema</button>
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

