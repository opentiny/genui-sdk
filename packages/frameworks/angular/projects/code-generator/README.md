# code-generator

Angular 代码出码器:把 AI 产出的页面 schema(`CardSchema`)转换为 Angular 单文件组件(`.component.ts`,含 inline template)。

## 架构

整个出码链路只依赖**两个类**,组件库差异通过配置注入:

- **`CodeGeneratorBase`** —— 框架无关基类,与 Vue 出码共用
- **`AngularCodeGeneratorBase`** —— Angular 特定,出码入口 + 类内组件库注册表(`AngularCodeGeneratorBase.libraries`)

不同组件库(TinyNG、未来的 Material/PrimeNG 等)各自提供一份 `IAngularLibraryConfig`,实现代码放在 `libraries/<library>/` 下,注册到 `AngularCodeGeneratorBase.libraries` 后即可出码,无需新增子类。

## 目录结构

```
projects/code-generator/
├── code-generator-base.ts           # 类1:框架无关基类
├── angular-code-generator-base.ts   # 类2:Angular 特定,出码入口 + 库注册表
├── types.ts                         # 公共类型(IAngularLibraryConfig 等)
├── index.ts                         # 对外导出(含 generateCode 入口)
└── libraries/                       # 组件库相关(抽象 + 各库实现)
    ├── prop-adapter.ts              # 跨库:prop 适配器抽象(AngularPropAdapter)
    ├── derive-library-maps.ts       # 跨库:从物料包 ɵcmp 元数据推导映射
    └── tinyng/                      # TinyNG 库实现
        ├── map.ts                   #   映射推导
        ├── prop-adapters.ts         #   prop 特判适配器
        └── config.ts                #   库配置汇总(TINYNG_CONFIG)
```

## 使用

```ts
import { AngularCodeGeneratorBase, generateCode } from './code-generator';

// 方式一:默认(opentiny-ng)入口
await generateCode({ pageInfo: { schema } });

// 方式二:直接实例化(可指定组件库)
new AngularCodeGeneratorBase().generate({ pageInfo: { schema } });                       // 默认单库 opentiny-ng
new AngularCodeGeneratorBase('opentiny-ng').generate({ pageInfo: { schema } });          // 指定单库
new AngularCodeGeneratorBase(['opentiny-ng', 'material']).generate({ pageInfo: { schema } }); // 多库混合出码
```

### 多组件库混合出码

- 构造/`create` 传库名**数组**即可同时启用多个组件库,一个 schema 可混用各库组件。
- 组件名到库的**路由规则**:按注册顺序(`AngularCodeGeneratorBase.libraries`)查 `libraryComponents` → `componentSelector` → `moduleRefMap`,首个命中该组件的库胜出;未命中兜底第一个库。
- 模块 import 按各库的 `libraryPackage` **分组生成多条 import**;组件的 `imports` 数组包含全部启用库的模块。
- 硬约定:**跨库组件名 / NgModule 类名需全局唯一**(同名模块无法在单文件里不 alias 同时 import)。
- 缺省不传 = 只启用 `defaultLibrary`(opentiny-ng),行为与旧版一致;注册表新增库不会隐式改变默认出码。

## 新增组件库

1. materials 目录下建物料包(components/modules 命名导出);
2. `libraries/` 下建 `<library>/` 目录,复用 `derive-library-maps` 推导映射,写 `map.ts`;
3. 按 `AngularPropAdapter` 抽象实现 `prop-adapters.ts`;
4. 仿 `libraries/tinyng/config.ts` 定义 `IAngularLibraryConfig`;
5. 在 `AngularCodeGeneratorBase.libraries` 注册表加一行。

## 组件特殊用法

各组件库对特定组件的特殊处理原因与示例(如 `<ti-pagination>` 的 `total`→`totalNumber`、`<ti-table>` 的 `srcData.state` 补全、JSSlot 列渲染等),记录在 `libraries/tinyng/record.md`。
