# Web Component 包

`@opentiny/genui-sdk-webcomponent` 提供一个开箱即用的自定义元素 `<genui-config-renderer>`，内置 OpenTiny Vue 物料。渲染、主题切换、国际化都由这一个标签完成，产物是一份自包含的 ES 模块，不需要 Vue 运行时，也不需要构建步骤。

包内只导出一个 `GenuiConfigRendererElement`，导入即注册标签。

需要用自己的物料库、或构建 React / Angular 产物时，见 [Web Component CLI](./cli.md)。

## 直接使用

```html
<script type="module" src="https://unpkg.com/@opentiny/genui-sdk-webcomponent/dist/genui-config-renderer.js"></script>

<genui-config-renderer
  content='{"componentName":"Page","children":[{"componentName":"TinyButton","props":{"text":"Hello"}}]}'
></genui-config-renderer>
```

在打包工具里引入即可，导入时会自动注册标签：

```ts
import '@opentiny/genui-sdk-webcomponent';
```

::: tip
产物是浏览器原生的 ES 模块，`file://` 双击打开会被模块的 CORS 规则拦住，需要任意静态服务器，例如 `npx http-server .` 后在浏览器访问。
:::

## 属性

除 `id` 是原生 attribute 外，其余属性同时支持 attribute（字符串）和 property（对象 / 布尔）。用 property 赋值可以直接传对象，不必自己序列化 JSON。

| 属性                                | 类型                      | 默认值  | 说明                                                                   |
| ----------------------------------- | ------------------------- | ------- | ---------------------------------------------------------------------- |
| `theme`                             | `string`                  | `light` | `light` / `dark` / `lite`（OpenTiny Vue 物料内置）/ `auto`（跟随系统） |
| `locale`                            | `string`                  | `zh_CN` | 如 `zh_CN`、`en_US`                                                    |
| `i18n`                              | JSON 字符串 \| 对象       | —       | 追加的文案                                                             |
| `id`                                | `string`                  | —       | 宿主元素的原生 id，只作用于元素本身，不会传给内部渲染器                |
| `content`                           | JSON 字符串 \| 对象       | `{}`    | 要渲染的 Schema                                                        |
| `generating`                        | 布尔                      | `false` | 是否正在流式输出                                                       |
| `is-json-complete`                  | 布尔                      | `false` | Schema 是否已接收完整                                                  |
| `custom-components`                 | JSON 字符串 \| 对象       | —       | 追加的组件，合并进物料                                                 |
| `custom-actions`                    | 对象                      | `{}`    | 自定义 Action，值是含 `execute` 函数的对象，只能用 property 传         |
| `required-complete-field-selectors` | JSON 字符串 \| 字符串数组 | —       | 需要缓冲的字段选择器                                                   |
| `state`                             | JSON 字符串 \| 对象       | —       | 初始 state                                                             |

布尔属性按 HTML 习惯处理：`generating="false"` 为 `false`，其余非空值（含不带值的 `generating`）为 `true`。

**物料来自构建，元素没有 `materials` 属性。** 想换物料请用 CLI 重新构建。

```js
const el = document.querySelector('genui-config-renderer');
el.content = { componentName: 'Page', children: [] };
el.generating = true;
```

## 主题与国际化

```html
<genui-config-renderer id="a" theme="dark" locale="zh_CN"></genui-config-renderer>
<genui-config-renderer id="b" theme="light" locale="en_US"></genui-config-renderer>
```

```js
document.querySelector('#a').theme = 'auto'; // 跟随系统
```

- `theme` **按元素隔离**。物料包的 `themeFactory` 会把内容包进一个带作用域的主题根节点并注入主题 CSS，同一页面上不同主题的元素互不影响。
- `locale` **不隔离**。i18n 是整份产物的模块级单例，每个元素的内部 `GenuiConfigProvider` 都会把自己的 `locale` 写回它。因此没有显式写 `locale` 的元素会把默认的 `zh_CN` 覆盖到全局，影响之后创建的元素；文案在元素创建时解析，改 `locale` 后需要重新创建元素。**请始终显式设置 `locale`。**

## 命令式创建

```js
import { GenuiConfigRendererElement } from '@opentiny/genui-sdk-webcomponent';

const el = new GenuiConfigRendererElement();
el.theme = 'dark';
el.content = { componentName: 'Page', children: [] };
document.body.appendChild(el);
```

## 导出

| 导出                         | 说明         |
| ---------------------------- | ------------ |
| `GenuiConfigRendererElement` | 元素构造函数 |

换物料、换标签名，或构建 React / Angular 产物，使用 [Web Component CLI](./cli.md)。
