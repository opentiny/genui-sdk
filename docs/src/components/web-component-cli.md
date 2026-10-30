# Web Component CLI

`genui-sdk-vue-build` 把渲染器和指定的 Vue 物料库打成一个自定义元素产物。它和包内自带的 `<genui-config-renderer>` 是同一份运行时代码，区别只在物料来源。

适合这样的场景：你已经有一份自己的物料库（参考 [自定义物料库](../examples/custom-materials)），想产出一个可以被 `<script type="module">` 直接加载的元素。

## 运行

```bash
npx genui-sdk-vue-build --materials ./my-materials
```

装到项目里当构建脚本用：

::: tabs
== npm

```bash
npm install -D @opentiny/genui-sdk-vue
npx genui-sdk-vue-build -m @scope/my-materials
```

== pnpm

```bash
pnpm add -D @opentiny/genui-sdk-vue
pnpm exec genui-sdk-vue-build -m @scope/my-materials
```

== yarn

```bash
yarn add -D @opentiny/genui-sdk-vue
yarn genui-sdk-vue-build -m @scope/my-materials
```

:::

CLI 及它用到的 `vite`、`@vitejs/plugin-vue`、`vite-plugin-css-injected-by-js` 都随 `@opentiny/genui-sdk-vue` 一起安装，不需要额外的构建配置。

## 参数

| 参数                     | 说明                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `-m, --materials <来源>` | 物料来源，可重复传入或用逗号分隔，多个物料会合并成一个产物    |
| `-t, --tag <名称>`       | 自定义元素标签名，默认 `genui-config-renderer`                |
| `-o, --out-dir <目录>`   | 产物输出目录，默认 `dist/web-component`，相对于执行命令的目录 |
| `-f, --file-name <名称>` | 产物文件名，不含扩展名，默认 `genui-config-renderer`          |
| `--no-minify`            | 关闭压缩                                                      |
| `--sourcemap`            | 生成 sourcemap                                                |
| `-h, --help`             | 显示帮助                                                      |
| `-v, --version`          | 显示版本号                                                    |

```bash
genui-sdk-vue-build -m @scope/materials-a -m ./materials-b -t my-genui -o dist/wc
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
| `./my-materials`           | 本地目录，优先读目录 `package.json` 的 `exports["./materials"]`，再依次尝试 `dist/materials.js`、`src/materials/index.ts`、`src/index.ts`、`index.js` |
| `./src/materials/index.ts` | 本地文件，直接使用                                                                                                                                    |

包名会从执行命令的目录开始向上查找 `node_modules`，所以 monorepo 里在子包中执行也能正确解析。

## 产物

```text
dist/web-component/
├─ genui-config-renderer.js    自包含 ES 模块，无外部依赖
└─ genui-config-renderer.d.ts  同名类型声明
```

产物默认自动注册 `<genui-config-renderer>`，同时导出 `GenuiConfigRendererElement`、`GENUI_CONFIG_RENDERER_TAG`、`registerGenuiConfigRenderer`、`materials` 和 `materialKey`。

改了标签名或文件名后，直接引用即可：

```bash
genui-sdk-vue-build -m ./my-materials -t my-genui -f my-genui
```

```html
<script type="module" src="./dist/web-component/my-genui.js"></script>
<my-genui content='{"componentName":"Page","children":[]}'></my-genui>
```

属性、主题、国际化的用法与内置元素完全一致，见 [Web Component](./web-component)。

## 构建约定

- 产物内只使用一份 Vue：CLI 会把 `vue` 解析到 `@opentiny/genui-sdk-vue` 自带的那一份并去重，避免两套响应式系统导致组件不更新。
- 内置 `process.env.NODE_ENV` 的静态替换，浏览器直接加载不会抛 `process is not defined`。
- 构建发生在执行命令的目录，**不读取**项目里的 `vite.config`，也**不清空**输出目录里已有的其他文件。
- 物料模板里可以使用自定义元素，CLI 不会把它当成未注册的 Vue 组件。

## 常见问题

| 现象                                                    | 原因与处理                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `物料路径不存在` / `无法在目录 … 中找到物料入口`        | `-m` 写错，或物料包没有导出 `materials`                                      |
| `无法从 … 向上找到依赖 …`                               | 物料包没有装到当前项目，先安装依赖                                           |
| `未找到 dist/web-component-factory.js`                  | 当前 `@opentiny/genui-sdk-vue` 版本过旧，升级到支持 Web Component 构建的版本 |
| 页面白屏、控制台报 `Failed to resolve module specifier` | 用 `file://` 打开了页面，改用静态服务器                                      |
| 物料样式没生效                                          | 物料包需要在入口里 import 自己的样式                                         |
| 需要完整堆栈                                            | 命令前加 `GENUI_WC_DEBUG=1`                                                  |
