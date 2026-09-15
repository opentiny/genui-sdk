# code-generator

Angular 代码出码器:把 AI 产出的页面 schema(`CardSchema`)转换为 Angular 单文件组件(`.component.ts`,含 inline template)。

## 架构

整个出码链路只依赖**两个类**,组件库差异通过配置注入:

- **`CodeGeneratorBase`** —— 框架无关基类,与 Vue 出码共用
- **`AngularCodeGenerator`** —— Angular 特定,出码入口 + 组件库配置(实例属性,构造时注入)

不同组件库(TinyNG、未来的 Material/PrimeNG 等)各自提供一份 `IAngularLibraryConfig`,实现代码放在 `libraries/<library>/` 下,经构造选项 `IAngularCodeGeneratorOptions.libraries` 按实例注入后即可出码,无需新增子类。激活列表不是类静态成员——每次构造都会解析出一份本实例专属的列表,使用方可以按需追加或替换库配置。TinyNG 是缺省项(见 `DEFAULT_LIBRARIES`),不传即启用。

## 目录结构

```
projects/code-generator/
├── code-generator-base.ts           # 类1:框架无关基类
├── angular-code-generator.ts        # 类2:Angular 特定,出码入口 + 库配置解析
├── types.ts                         # 公共类型(IAngularLibraryConfig 等)
├── index.ts                         # 对外导出(含 generateCode 入口)
└── libraries/                       # 组件库相关(抽象 + 各库实现)
    ├── prop-adapter.ts              # 跨库:prop 适配器抽象(AngularPropAdapter)
    ├── derive-library-maps.ts       # 跨库:从物料包 ɵcmp 元数据推导映射
    └── tinyng/                      # TinyNG 库实现
        ├── map.ts                   #   映射推导
        └── config.ts                #   库配置汇总(TINYNG_CONFIG)
```

## 使用

```ts
import { AngularCodeGenerator, generateCode } from './code-generator';

// 方式一:默认(opentiny-ng)入口
await generateCode({ pageInfo: { schema } });

// 方式二:直接实例化(可指定组件库)
new AngularCodeGenerator().generate({ pageInfo: { schema } });                        // 缺省单库 TinyNG
new AngularCodeGenerator({ libraries: [TINYNG_CONFIG] }).generate({ pageInfo: { schema } });           // 显式指定单库
new AngularCodeGenerator({ libraries: [TINYNG_CONFIG, MATERIAL_CONFIG] }).generate({ pageInfo: { schema } }); // 多库混合出码

// 方式三:注入自定义组件库(不必修改出码器源码)
new AngularCodeGenerator({
  libraries: [MATERIAL_CONFIG], // 数组顺序即路由优先级;不传 / 传空数组则仅启用内置 TinyNG
}).generate({ pageInfo: { schema } });
```

> 注入的 `IAngularLibraryConfig` 中,`componentSelector` / `moduleRefMap` / `componentExtraSelector` / `libraryComponents` 四项必须经 `deriveLibraryMaps(该库自己的物料包 materials)` 推导,不要手写——推导依赖导入物料包时对 Angular 编译器元数据(`ɵcmp.selectors`)的写入,手写映射会随物料包演进静默漂移(见 `libraries/derive-library-maps.ts`)。其余字段(`libraryPackage` / `propBlacklist` / `transformChildren` 等)是各库自己的策略,按需手写。

### 多组件库混合出码

- 向 `options.libraries` 传**配置数组**即可同时启用多个组件库,一个 schema 可混用各库组件。
- 组件名到库的**路由规则**:按数组顺序查 `libraryComponents` → `componentSelector` → `moduleRefMap`,首个命中该组件的库胜出;全部未命中则兜底第一个库。
- 模块 import 按各库的 `libraryPackage` **分组生成多条 import**;组件的 `imports` 数组包含全部启用库的模块。
- 硬约定:**跨库组件名 / NgModule 类名需全局唯一**(同名模块无法在单文件里不 alias 同时 import)。
- 缺省不传 = 只启用内置 TinyNG;新增库不会隐式改变默认出码。

## 新增组件库

1. materials 目录下建物料包(components/modules 命名导出);
2. `libraries/` 下建 `<library>/` 目录,复用 `derive-library-maps` 推导映射,写 `map.ts`;
3. 仿 `libraries/tinyng/config.ts` 定义 `IAngularLibraryConfig`;
4. 由使用方经 `IAngularCodeGeneratorOptions.libraries` 按实例注入;若该库应成为缺省库,再追加到 `angular-code-generator.ts` 的 `DEFAULT_LIBRARIES`。

> 形态类 prop 问题一律先在物料包 meta/示例里写对(见 `libraries/tinyng/record.md`),出码器不做特判;仅当确有通用规则无法覆盖的形态重塑需求时,才复用 `prop-adapter.ts` 抽象实现并按 `propAdapters` 注入(当前 TinyNG 未使用)。

## 组件特殊用法

各组件库对特定组件的特殊处理原因与示例(如 `<ti-pagination>` 的 `total`→`totalNumber`、JSSlot 列渲染等),记录在 `libraries/tinyng/record.md`。
