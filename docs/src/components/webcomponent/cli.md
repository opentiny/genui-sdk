# Web Component CLI

`genui-sdk-build-webcomponent` 把渲染器和指定的物料库打成一个自定义元素产物，Vue / React / Angular 三端共用这一个命令（`-F` 选择框架）。它和默认产物包 `@opentiny/genui-sdk-webcomponent` 是同一份运行时代码，区别只在框架与物料来源。

适合这样的场景：你已经有一份自己的物料库（参考 [自定义物料库](../examples/custom-materials)），想产出一个可以被 `<script type="module">` 直接加载的元素。

## 运行

```bash
npx genui-sdk-build-webcomponent --materials ./my-materials
```

装到项目里当构建脚本用：

::: tabs
== npm

```bash
npm install -D @opentiny/genui-sdk-build-webcomponent
npx genui-sdk-build-webcomponent -m @scope/my-materials
```

== pnpm

```bash
pnpm add -D @opentiny/genui-sdk-build-webcomponent
pnpm exec genui-sdk-build-webcomponent -m @scope/my-materials
```

== yarn

```bash
yarn add -D @opentiny/genui-sdk-build-webcomponent
yarn genui-sdk-build-webcomponent -m @scope/my-materials
```

:::

CLI 用到的 `vite` 与各框架插件都随 `@opentiny/genui-sdk-build-webcomponent` 一起安装，不需要额外的构建配置。三端的 GenUI 运行时（`@opentiny/genui-sdk-vue` / `-react` / `-angular`）是 CLI 的依赖，装 CLI 时会自动装好，版本由 CLI 锁定，**不需要你单独安装或选择版本**；只有框架本身（`vue` / `react` / `@angular/core` 与 `zone.js`）由你的项目提供，保证运行时单例。

## 参数

| 参数                       | 说明                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `-F, --framework <名称>`   | 目标框架：`vue` / `react` / `angular`，默认 `vue`             |
| `-m, --materials <来源>`   | 物料来源，可重复传入或用逗号分隔，多个物料会合并成一个产物    |
| `-t, --tag <名称>`         | 自定义元素标签名，默认 `genui-config-renderer`                |
| `-o, --out-dir <目录>`     | 产物输出目录，默认 `dist/web-component`，相对于执行命令的目录 |
| `-f, --file-name <名称>`   | 产物文件名，不含扩展名，默认 `genui-config-renderer`          |
| `--minify` / `--no-minify` | 开启 / 关闭压缩（默认开启）                                   |
| `--sourcemap`              | 生成 sourcemap                                                |
| `-h, --help`               | 显示帮助                                                      |
| `-v, --version`            | 显示版本号                                                    |

```bash
# Vue（默认）
genui-sdk-build-webcomponent -m @scope/materials-a -m ./materials-b -t my-genui -o dist/wc

# React
genui-sdk-build-webcomponent -F react -m @scope/react-materials

# Angular
genui-sdk-build-webcomponent -F angular -m @scope/ng-materials
```

## 三端差异

| 框架      | 物料要求                                                       | 注册方式 | 项目需自备                                     |
| --------- | -------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `vue`     | Vue 组件（`materials` 对象）                                   | 同步     | `vue`；GenUI 运行时随 CLI 安装                 |
| `react`   | React 组件（`materials` 对象）                                 | 同步     | `react` / `react-dom`；GenUI 运行时随 CLI 安装 |
| `angular` | Angular `standalone` 组件（`materials` 对象）                  | **异步** | `@angular/core` 与 `zone.js`；GenUI 运行时随 CLI 安装 |

Angular 的 `customElements.define` 依赖初始化完成的 injector，所以 `GenuiConfigRendererElement` 是一个 `Promise<CustomElementConstructor>`；标签在注册完成后会自动升级页面上已存在的元素，使用方不需要额外处理：

```js
import { GenuiConfigRendererElement } from './dist/web-component/genui-config-renderer.js';

await GenuiConfigRendererElement;
const el = document.createElement('genui-config-renderer');
document.body.appendChild(el);
```

## 物料来源

物料模块需要导出一个 `materials` 对象（`IMaterials`）：

```ts
// my-materials/materials.ts
export const materials = {
  components: {/* 组件清单 */},
  actions: {/* 内置动作 */},
};
```

`-m` 支持四类写法：

| 写法                       | 解析方式                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@scope/my-materials`      | npm 包名，默认取该包的 `/materials` 子路径；没有该子路径时按 `import` / `module` / `main` 解析包入口                                                  |
| `@scope/my-materials/sub`  | 指定包内子路径                                                                                                                                        |
| `./my-materials`           | 本地目录：优先读目录 `package.json` 的 `exports["./materials"]`，再读包主入口（`import` / `module` / `main`），最后依次尝试 `dist/materials.js`、`dist/index.js`、`src/materials/index.ts`、`src/index.ts`、`index.js` |
| `./src/materials/index.ts` | 本地文件，直接使用                                                                                                                                    |

包名会从执行命令的目录开始向上查找 `node_modules`，所以 monorepo 里在子包中执行也能正确解析。

## 产物

```text
dist/web-component/
├─ genui-config-renderer.js    自包含 ES 模块，无外部依赖
└─ genui-config-renderer.d.ts  同名类型声明
```

产物默认自动注册 `<genui-config-renderer>`，同时导出 `GenuiConfigRendererElement`、`GENUI_CONFIG_RENDERER_TAG`、`registerGenuiConfigRenderer`、`materials` 和 `materialKey`。Vue / React 还额外导出 `createGenuiConfigRendererElement(materials?)`；Angular 额外导出 `defineGenuiConfigRenderer(tagName?, materials?)`，并且 `GenuiConfigRendererElement` 是 `Promise<CustomElementConstructor>`。

改了标签名或文件名后，直接引用即可：

```bash
genui-sdk-build-webcomponent -m ./my-materials -t my-genui -f my-genui
```

```html
<script type="module" src="./dist/web-component/my-genui.js"></script>
<my-genui content='{"componentName":"Page","children":[]}'></my-genui>
```

属性、主题、国际化的用法与默认产物一致，见 [Web Component](./index.md)。

## 构建约定

- 产物内只使用一份框架运行时：CLI 会把 `vue` / `react` 解析到使用方项目里的那一份并去重，避免两套响应式或 hooks 系统导致组件不更新。
- 内置 `process.env.NODE_ENV` 的静态替换，浏览器直接加载不会抛 `process is not defined`。
- 构建发生在执行命令的目录，**不读取**项目里的 `vite.config`，也**不清空**输出目录里已有的其他文件。
- Vue 物料模板里的未知标签按 Vue 组件解析；如果物料确实要放自定义元素，需要在物料里自行注册。

## 常见问题

| 现象                                                    | 原因与处理                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `物料路径不存在` / `无法在目录 … 中找到物料入口`        | `-m` 写错，或物料包没有导出 `materials`                                        |
| `无法从 … 向上找到依赖 …`                               | 物料包没有装到当前项目，先安装依赖                                             |
| `无法解析物料 "…"`                                     | 包名写错，或当前项目里没有安装该包                                             |
| `无法确定 … 的入口文件`                                 | 物料包的 `package.json` 里 `exports` / `module` / `main` 都没有可用入口        |
| `无法解析 vue` / `无法解析 react`                        | 执行命令的项目里要装好对应框架（`vue` / `react` + `react-dom`）                |
| `无法解析 @angular/core` / `无法解析 zone.js`           | 用 `-F angular` 时，执行命令的项目里要装好 Angular 与 `zone.js`                |
| 页面白屏、控制台报 `Failed to resolve module specifier` | 用 `file://` 打开了页面，改用静态服务器                                        |
| 物料样式没生效                                          | 物料包需要在入口里 import 自己的样式                                           |
| 需要完整堆栈                                            | 命令前加 `GENUI_WC_DEBUG=1`                                                    |
