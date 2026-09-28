# code-generator

Angular 代码出码器:把 AI 产出的页面 schema(`CardSchema`)转换为 Angular 单文件组件(`.component.ts`,含 inline template)。

## 架构

整个出码链路只依赖**两个类**,物料包差异通过配置注入:

- **`CodeGeneratorBase`** —— 框架无关基类,与 Vue 出码共用
- **`AngularCodeGenerator`** —— Angular 特定,出码入口 + 物料配置(实例属性,构造时注入)

各物料包(TinyNG、未来的 Material/PrimeNG 等)各自提供一份 `IAngularMaterialsConfig`,**住在各自的物料包里**(如 TinyNG 的 `@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator` 导出 `TINYNG_CONFIG`),经构造选项 `IAngularCodeGeneratorOptions.materials` 按实例注入后即可出码,无需新增子类。本包不持有任何物料包实现,也不反向 import 任何物料包。

激活列表不是类静态成员、也没有单例语义——每次构造都会展开出一份本实例专属的列表,使用方可以按需追加或替换物料配置。**没有缺省值:不传 `materials` 会在构造时直接抛错**(出码器不 import 任何物料包,拿不到默认配置)。

> 配置为什么放物料包:那些映射表读的是**该物料包自己的** Angular 编译器元数据(`ɵcmp.selectors`),放在自己家里推导最不容易与物料包演进漂移;节点级特殊处理(`extensions`)也全是该物料包自己的约定。

## 目录结构

```
projects/code-generator/
├── package.json  package-lock.json  node_modules/   # 包名 code-generator-dev;5175 页的工程文件,独立 npm 安装
├── vite.config.ts                   #   同上,root 指向 src
├── tsconfig.json                    #   同上,只收 5175 页那几个文件
├── code-generator-base.ts           # 类1:框架无关基类
├── angular-code-generator.ts        # 类2:Angular 特定,出码入口 + 物料配置解析
├── types.ts                         # 公共类型(IAngularMaterialsConfig 等)
├── index.ts                         # 对外导出(不含 generateCode 便捷入口,见文件内注释)
├── materials/                       # 物料包相关抽象(不再有各物料包实现)
│   └── materials-extension.ts       # 跨物料包:唯一的扩展点 IAngularMaterialsExtension
└── src/                             # 两个页面同住,都不属于出码器实现本身
    ├── index.html main.ts style.css   # 5175 出码页(vite,root 即本目录)
    ├── preview.html preview-main.ts preview.ts preview.less   # 4201 预览页(Angular app)
    ├── styles.less tsconfig.app.json #   同上:app 全局样式与它自己的 tsconfig
    ├── generated/schema-card.ts     #   出码产物:5175 页复制它,4201 页渲染它
    └── headless/entry.ts            # 无头跑法(不开浏览器)

packages/materials/angular-opentiny-ng/src/code-generator/   # ← 各物料包实现住在物料包
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

// 唯一入口即构造器,materials 必传
new AngularCodeGenerator({ materials: [TINYNG_CONFIG] }).generate({ pageInfo: { schema } });           // 单物料包
new AngularCodeGenerator({ materials: [TINYNG_CONFIG, MATERIAL_CONFIG] }).generate({ pageInfo: { schema } }); // 多物料包混合出码

// 注入自定义物料配置(不必修改出码器源码)
new AngularCodeGenerator({
  materials: [MATERIAL_CONFIG], // 数组顺序即路由优先级
}).generate({ pageInfo: { schema } });
```

> 注入的 `IAngularMaterialsConfig` 中,`elementSelector` / `moduleRefMap` / `attributeSelector` / `componentExportMap` / `materialsComponents` 五项必须经 `deriveMaterialsMaps(该物料包自己的 materials)` 推导,不要手写——推导读的是物料包的 Angular 编译器元数据(`ɵcmp.selectors`),手写映射会随物料包演进静默漂移。该工具随配置一并住在物料包内(见上文目录结构)。
>
> 物料包侧的配置结构是一份**结构副本**(物料包是已发布包,不能反向依赖 private 且无 npm 产物的出码器包)。契约由**出码器侧强制**:把该配置赋给 `IAngularMaterialsConfig[]` 时若结构漂移,会在出码器包编译期报 `TS2322`。

### 多物料包混合出码

- 向 `options.materials` 传**配置数组**即可同时启用多个物料包,一个 schema 可混用各包组件。
- 组件名到物料包的**路由规则**:按数组顺序查 `materialsComponents` → `elementSelector` → `attributeSelector` → `moduleRefMap`,首个命中该组件的物料包胜出;全部未命中则兜底第一个。
- 模块 import 按各包的 `libraryPackage` **分组生成多条 import**;组件的 `imports` 数组包含全部启用物料包的模块。
- 硬约定:**跨物料包的组件名 / NgModule 类名需全局唯一**(同名模块无法在单文件里不 alias 同时 import)。
- 新增物料包不会隐式改变已有调用方的出码结果:配置由调用方显式传入。

## schema 约定:模板作用域与引用

Angular **没有插槽(slot)概念**——只有 `ng-content` 投影与 `ng-template` 模板。因此协议里的 `JSSlot` 在出码侧不被表达,`slot` 字段与 JSSlot 值的属性都会被静默丢弃(出码器不报错,见下)。取而代之的是下面三条约定。

### 1. 作用域模板:`NgTemplate` + `props.let`

schema 里用 `componentName: "NgTemplate"` 表达 `<ng-template>`,`props.let` 是 `{ 局部变量名: 上下文属性名 }` 的透传表,逐项产出 `let-<局部变量名>="<上下文属性名>"`:

```json
{
  "componentName": "DTableBody",
  "children": [
    {
      "componentName": "NgTemplate",
      "props": { "let": { "rowItem": "rowItem", "rowIndex": "rowIndex" } },
      "children": [
        { "componentName": "Text", "props": { "text": { "type": "JSExpression", "value": "rowIndex + 1" } } }
      ]
    }
  ]
}
```

产出 `<ng-template let-rowItem="rowItem" let-rowIndex="rowIndex">{{ rowIndex + 1 }}</ng-template>`。

- **键值对纯透传**:原样拼成 `let-<键>="<值>"`,不解析、不 `replaceThis`、也不校验键值内容——写得对不对由生成 schema 的一侧负责。`$implicit` 这类合法名字同样原样透传。
- 右值是「宿主模板上下文对象上的一次属性查找」,上下文由宿主组件运行时经 `[ngTemplateOutletContext]` / `createEmbeddedView(tpl, ctx)` 提供(devui 的 `TableTbodyComponent` 就是把自身 `*ngFor` 的变量装进 context 递进来的)。模板自身作用域里没有这个键,编译期无从校验,校验只会全是误报——这是不校验的根本原因。
- `let-` 只在 `<ng-template>` 上合法,其它节点上的 `let` 会被丢弃;值不是「键值对对象」时同样丢弃。两者都不产出、也不报错。
- `NgTemplate` 是 Angular 内置容器,**不会**进 `componentSet`,所以不会产出不存在的 `NgTemplateModule`;也**不依赖** `hyphenate('NgTemplate')` 恰好等于 `ng-template` 这个巧合,标签名是写死的。小写 `template` 不是别名——它是原生 HTML 标签,别名声明的写法会把它劫持成 `<ng-template>`。
- 同一节点上 `loop`(*ngFor)与 `let` 并存时不拦截也不提示:两者取值上下文不同(`let-` 取宿主传入的上下文,`*ngFor` 建自己的循环上下文),是否真需要并存由 schema 侧判断。

### 2. 组件引用:`props.ref` / `props.refName`

所有组件(原生标签与物料组件)都可挂引用。语义对齐渲染器侧的 `schema-ref-binding`,**区别只在是否落类字段**:

| schema | 模板 | 类体 |
| --- | --- | --- |
| `props.refName: 'localInput'` | `#localInput` | 无(仅模板局部引用) |
| `props.ref: { type:'JSExpression', value:'this.refs.myTable' }` | `#myTable` | `@ViewChild('myTable') myTable!: TiTableComponent` + `refs` 字段 + `ngAfterViewInit` 赋值 |
| 同上,但下标是**作用域内可见的循环索引**(值形如 `this.refs.loopInputs[index]`;`loop` 在本节点或任一祖先节点上都算) | `#loopInputs` | `@ViewChildren('loopInputs') loopInputs!: QueryList<ElementRef>` + 整组写进 `refs` |

字段类型按 **ref 值的实际形态**推导,与渲染器 `resolveSchemaRefValue` **同一判据**——判"这个名字注册过物料吗",而不是判"componentName 是不是原生标签":

- 注册过物料(名字命中 `materialsComponents` / `elementSelector` / `attributeSelector` / `moduleRefMap`) → 该组件类名(运行时给的是组件实例),类名与所属 npm 包由 `componentExportMap` 推出,并与 NgModule **并入同一条 import 行**
- 没注册(原生标签、以及渲染器会兜底建 `NativeElementComponent` 的其它动态标签名) → `ElementRef` + `.nativeElement`(运行时给的是 `location.nativeElement`)
- `ng-template` → `TemplateRef<any>`

判据**为什么不能按标签走**:TinyNG 的 24 个物料里有 5 个的宿主标签恰恰就是原生标签(`TiText` / `TiCheckbox` / `TiRadio` → `input`、`TiTextArea` → `textarea`、`TiButton` → `button`),但那些名字在画布里命中的是物料、ref 值是组件实例。一旦按"标签是原生 DOM"去展开,同一份 schema 在画布与出码产物里就会拿到两个不同的东西(画布给实例、产物给 DOM 元素),而且波及的是最常用的那几个组件。

取值写法因此分两类:未注册名的 ref 直接取(`refs.myBox.value`),物料 ref 再取一层 `.nativeElement`(`refs.inputs[index].nativeElement.value`)——`TiBaseComponent` 运行期就把它挂在实例上(`this.nativeElement = hostRef.nativeElement`),画布与产物两侧都取得到。

`props.ref` 的值是**赋值目标**而非读取值——渲染器把它重写成 `(instance) => <值> = instance`——所以 refs 里收的是「未注册名给 DOM 元素、物料名给组件实例」。而查询拿回的永远是 `ElementRef` / 组件实例 / `TemplateRef`,故未注册名那一支**赋值时还要再取一层 `.nativeElement`**,否则 `refs.x.value` 这类按元素写的消费代码会落空。这条结论在 `resolveRefFieldType` 里固化成 `unwrapNative`,不靠事后比较类型名字符串判断。

循环上的 ref 走 `@ViewChildren` + `QueryList`:Angular 没有「按下标逐格写入」的等价物,改为一次查询收回有序集合、整组写进 refs(`.toArray()` 的顺序即 `*ngFor` 的迭代顺序,索引语义因此等价),并订阅 `changes`,让 `refs` 随视图增减同步、不停在首帧快照上。

两条判定门槛(按**模板作用域**判断,不按节点自己带不带 `loop`——`*ngFor` 建的是模板作用域,子节点照旧看得见 `item` / `index`,表达式路径一直依赖这点;见 `resolveLoopScope`。作用域里可见的索引变量由外到内累积,嵌套循环里引用外层索引的内层 ref 因此合法):

- 裸名字 + 作用域内有循环 → **丢弃**。N 个迭代争抢同一个 `@ViewChild`,查询只命中第一个,语义无解(`#name` 也不能插值成 `#name_0`,N 在出码期未知)。
- `refs.x[下标]` 里的下标必须是**作用域内可见的循环索引变量**(本节点的 `loopArgs[1]`,或任意外层循环声明的)→ 否则丢弃。字典形态(`refs.map[item.id]`)与作用域外的下标都无从表达。

`props.refName` 不受循环所限:它只是模板局部的 `#name`,`*ngFor` 里每迭代独立、天然合法。

`refs` 字段标注 `any`,而不是 `Record<string, any>`:后者是索引签名,在开启 `noPropertyAccessFromIndexSignature` 的工程里 `this.refs.x` 会报 TS4111,而 `refs.x` 正是本特性对外承诺的读写形态(schema 的方法体里也是这么写的);`any` 同时避免对象字面量把 `refs.x` 推成 `null` 字面量类型。字段名与已有类成员撞名时经 `avoidDuplicateString` 改名,`#name` 查询键与 `refs.<name>` 契约保持不变。
