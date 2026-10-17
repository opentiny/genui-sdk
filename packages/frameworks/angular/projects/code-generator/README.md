# code-generator

Angular 代码出码器:把 AI 产出的页面 schema(`CardSchema`)转换为 Angular 单文件组件(`.component.ts`,含 inline template)。

## 架构

整个出码链路只依赖**两个类**,物料包差异通过配置注入:

- **`CodeGeneratorBase`** —— 框架无关基类,与 Vue 出码共用
- **`AngularCodeGenerator`** —— Angular 特定,出码入口 + 物料配置(实例属性,构造时注入)

各物料包(TinyNG等)各自提供一份 `IAngularMaterialsConfig`, 如 TinyNG 的 `@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator` 导出 `TINYNG_CONFIG`, 向AngularCodeGenerato构造函数传入`TINYNG_CONFIG`后，其实例即可出码。

## 目录结构

```
projects/code-generator/
├── package.json  node_modules/
├── vite.config.ts                   
├── tsconfig.json                    
├── code-generator-base.ts           # 类1:框架无关基类
├── angular-code-generator.ts        # 类2:Angular出码门面(装配下面各层,拼出组件文件)
├── angular-source-text.ts           # 文本层:JSFunction 源串解析/改写/prettier
├── angular-materials-registry.ts    # 物料层:组件名 → tag/选择器/import 清单
├── angular-ref-resolver.ts          # ref 层:模板 #name ⇄ 类里 refs.<name>
├── angular-binding-renderer.ts      # 绑定层:props → [x]/(x)/静态属性/let-*
├── angular-template-renderer.ts     # 模板层:schema 树 → template 串
├── angular-class-body.ts            # 类体层:state/methods/生命周期 → 类成员
├── base-helpers.ts                  # 基类纯函数的注入接口(各层不是基类子类)
├── constants.ts                     # 协议串常量
├── utils.ts                         # 小工具(取名字/转大小写/转义等)
├── types.ts                         # 公共类型
├── index.ts                         # 对外导出
├── .local/                          # 本地临时物,不入库
│   ├── TEST-PROMPTS.md              # 出码测试用的提示词
│   └── headless/entry.ts            # 无头跑法(不开浏览器)
└── src/                             # 用于测试出码
    ├── gen-page/                    # 5175 出码测试执行页
    │   └── index.html main.ts style.css
    ├── preview/                     # 4201 出码渲染效果展示页
    │   └── preview.html preview.ts preview.less styles.less tsconfig.app.json
    └── generated/schema-card.ts     # 出码产物:5175 页复制它,4201 页渲染它

packages/materials/angular-opentiny-ng/src/code-generator/
├── config.ts                        #   TINYNG_CONFIG(物料配置汇总)
├── derive-materials-maps.ts         #   从本包 ɵcmp 元数据推导 5 张映射表
├── types.ts                         #   配置结构约定(与出码器侧结构对齐)
├── record.md                        #   特殊处理的原因与历史
└── index.ts                         #   子出口 .../code-generator
```

## 使用

```ts
import { AngularCodeGenerator } from './code-generator';

// 物料配置从物料包里取,出码器本身不自带
import { TINYNG_CONFIG } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator';

// 唯一入口即构造器
new AngularCodeGenerator({ materials: [TINYNG_CONFIG] }).generate({ pageInfo: { schema } });           // 单物料包
new AngularCodeGenerator({ materials: [TINYNG_CONFIG, MATERIAL_CONFIG] }).generate({ pageInfo: { schema } }); // 多物料包混合出码
```

## 启动测试界面
```bash
cd packages/frameworks/angular/projects/code-generator
pnpm dev:pages
```
命令会开启 localhost:5175 测试页，以及 localhost:4201 预览页
要把出码结果复制粘贴在 genui-sdk\packages\frameworks\angular\projects\code-generator\src\generated\schema-card.ts 文件里localhost:4201 预览页才可预览
