# Angular 支持

GenUI SDK 支持在 Angular 应用中使用 schema 渲染器。该组件基于 TinyUI 组件库构建，可以让你通过 JSON schema 动态渲染 Angular 组件。

## 技术栈兼容的协议

Angular 版本的 schema 渲染器使用与 Vue 版本相同的 JSON Schema 协议格式，确保跨框架的兼容性。Schema 协议定义了组件的结构、状态、方法和渲染逻辑，可以无缝在不同技术栈间迁移。

### 完整的 schemaJson

Schema JSON 是一个标准的 JSON 对象：

```json
{
  "componentName": "Page",
  "state": {
    "formData": {
      "name": "",
      "email": ""
    }
  },
  "methods": {
    "handleSubmit": {
      "type": "JSFunction",
      "value": "function handleSubmit() { console.log('表单提交:', this.state.formData) }"
    }
  },
  "children": [
    {
      "componentName": "TiFormField",
      "props": {
        "style": "padding: 20px; max-width: 500px;"
      },
      "children": [
        {
          "componentName": "TiItem",
          "props": {
            "label": "姓名",
            "labelWidth": "100px"
          },
          "children": [
            {
              "componentName": "TiText",
              "props": {
                "placeholder": "请输入姓名",
                "ngModel": {
                  "type": "JSExpression",
                  "model": true,
                  "value": "this.state.formData.name"
                }
              },
              "directives": [
                {
                  "directiveName": "ngModel"
                },
                {
                  "directiveName": "defaultValueAccessor"
                }
              ]
            }
          ]
        },
        {
          "componentName": "TiItem",
          "props": {
            "label": "邮箱",
            "labelWidth": "100px"
          },
          "children": [
            {
              "componentName": "TiText",
              "props": {
                "placeholder": "请输入邮箱",
                "ngModel": {
                  "type": "JSExpression",
                  "model": true,
                  "value": "this.state.formData.email"
                }
              },
              "directives": [
                {
                  "directiveName": "ngModel"
                },
                {
                  "directiveName": "defaultValueAccessor"
                }
              ]
            }
          ]
        },
        {
          "componentName": "div",
          "props": {
            "style": "display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;"
          },
          "children": [
            {
              "componentName": "TiButton",
              "props": {
                "color": "primary",
                "onClick": {
                  "type": "JSExpression",
                  "value": "this.handleSubmit"
                }
              },
              "children": "提交"
            }
          ]
        }
      ]
    }
  ]
}
```

## 基本使用

### 1. 导入组件

在你的 Angular 组件中导入 `RendererMain`：

```typescript
import { Component, signal } from '@angular/core';
import { RendererMain } from 'tiny-schema-renderer-ng';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [RendererMain, FormsModule],
  template: ` <tiny-schema-renderer [schema]="schema()"></tiny-schema-renderer> `,
})
export class ExampleComponent {
  schema = signal<any>({});

  async ngOnInit() {
    // 加载你的 schema
    this.schema.set(await import('./schema.json').then((m) => m.default));
  }
}
```

### 2. 导入样式

在你的 `main.ts` 或全局样式文件中导入 TinyUI 的样式：

```typescript
import '@opentiny/ng-themes/styles.css';
import '@opentiny/ng-themes/theme-default.css';
```

## Angular 版本 Chat 组件

目前 Angular 版本的集成式 Chat 组件还在开发中，敬请期待~
