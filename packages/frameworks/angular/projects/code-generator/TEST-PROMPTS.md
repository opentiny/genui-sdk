# Angular 出码器 · 从 playground 逼出 schema 的提示词

给「playground 生成 schema → 出码 → 4201 编译渲染」这条手工链路用的测试提示词。

**为什么需要这份东西**:playground 喂给 AI 的 prompt(白名单 + 组件 JSON Schema + 6 个示例 + 17 条规则)已经把输出形状钉死在很窄的一段里 —— 字面量 prop、`loop` 列表、`onXxx`+`JSFunction`、`Text`、`TiCard` 包根节点。不点名的话,20 次生成也只会反复踩那 10 个组件。**下面每一条都在点名一个 AI 不会自发走的分支。**

---

## 每轮 7 步

1. playground 选 **Angular + TinyNg** → 粘一条提示词 → 生成 schema
2. **先在 playground 里看渲染结果** —— 渲染器是基准(标准答案)
3. schema 存到 `src/generated/schemas/T<n>-<名字>.json`
4. 5175 出码页出码 → 整份覆盖 `src/generated/schema-card.ts`
5. `cd packages/frameworks/angular && npx ng build code-generator-preview`(≈2 秒),ERROR 行追加进 `src/generated/PROBES.md`
6. `npx ng serve code-generator-preview` → 4201,和步骤 2 的渲染对比
7. 记一行结论

**判定归因**(这一步是这条链路唯一的降噪手段,别省):

| 现象 | 结论 |
| --- | --- |
| 步骤 2 渲染就不对 | **schema 的锅**,别动出码器 |
| 步骤 2 对、步骤 5 报错 | **出码器的锅**,报错行即定位 |
| 两边都编过、渲染不一样 | **语义 bug**(编译期查不出来的那类,最值钱) |
| 两边都编过、渲染一样 | 通过 |

---

## T1 · 循环索引(坑一回归)

> 生成一个「项目进度看板」卡片:state 里放一个分组数组,每个分组有名称和若干任务(任务含标题和完成状态)。外层用 loop 遍历分组,**循环变量用 `item`、序号用 `index`**;内层再遍历任务,**循环变量用 `task`、序号用 `taskIndex`**。每个任务后面放一个 TiButton 写「标记完成」,点击时用 `console.log` 打印 `index`、`item.name`、`task.title`、`taskIndex` 这四个值。根节点用 TiCard 包。

- **测**:事件处理器同时引用两层循环变量 —— 尤其 `index`(刚修掉的那个关键字黑名单)+ 嵌套 `*ngFor` 的作用域合并。
- **期望**:`(click)="__handle1($event, item, index, task, taskIndex)"`,方法签名 `__handle1(event?: any, item?: any, index?: any, task?: any, taskIndex?: any)`。**`index` 必须出现在实参里**(修复前的产物会漏掉它,方法体里剩一个悬空的 `index`)。

## T2 · 未覆盖组件群 A(设置面板)

> 生成一个「通知设置」卡片:用 TiSwitch 控制「接收通知」、TiSlider 调「提醒频率」、TiRate 设「优先级」、TiDateRange 选「生效日期」。state 里为每一项声明对应字段,四个控件都要双向绑定到 state。底部放一个 TiButton 写「保存」,点击时打印当前所有设置值。根节点用 TiCard 包。

- **测**:TiSwitch / TiSlider / TiRate / TiDateRange 四条从没被任何示例碰过的路径 + `model: true` 双向绑定 ×4。
- **期望**:`ti-switch` / `ti-slider` / `ti-rate` / `ti-date-range` 四个标签;`[(ngModel)]="state.xxx"`;imports 里出现 TiSwitchModule / TiSliderModule / TiRateModule / TiDateRangeModule。

## T3 · 未覆盖组件群 B(上传 + 图标 + 两个 group)

> 生成一个「素材提交」卡片:用 TiUpload 上传文件、TiIcon 显示一个 search 图标、TiCheckboxGroup 多选「适用平台」、TiRadioGroup 单选「素材类型」,各自双向绑定到 state,底部 TiButton 打印选择结果。

- **测**:TiUpload / TiIcon / TiCheckboxGroup / TiRadioGroup + **同模块被多组件共用的去重**(TiCheckboxGroup→TiCheckboxModule、TiRadioGroup→TiRadioModule)。
- **期望**:`ti-upload` / `ti-icon` / `ti-checkbox-group` / `ti-radio-group`;imports 里 `TiCheckboxModule`、`TiRadioModule` 各只出现一次。

## T4 · 表单容器(TiFormField + TiItem)

> 生成一个「员工入职登记」表单卡片:用 TiFormField 包住整个表单并设 labelWidth 为 120px,每个字段用 TiItem 加 label,姓名和邮箱标 required;姓名、邮箱用 TiText 输入,部门用 TiSelect,入职日期用 TiDate;都双向绑定到 state.formData 上;底部放一个 TiButton 写「提交」,点击时打印 formData。

- **测**:`TiFormField` 与 `TiItem` 的模块别名(两者都走 TiFormfieldModule);`[labelWidth]` / `[label]` / `[required]` 三类绑定。
- **期望**:产物里有 `ti-formfield` + `labelWidth`、`ti-item` + `label`/`required`,imports 里 `TiFormfieldModule` 只出现一次。
- **顺带**:当前仓库里 committed 的 `src/generated/schema-card.ts` 就是这个形状,而**它的来源已经不可考**(6 个示例里一个 formfield 都没有)。这一轮可以顺便判定那份产物到底对不对。

## T5 · 表格列:TiTableColumn(白名单里有、物料注册表里没有)

> 生成一个「订单列表」卡片:用 TiTable 展示订单数据,**列用 TiTableColumn 声明**(每列有 title 和 field 两个属性),数据源放在 state 里;表格下方放 TiPagination 翻页,分页参数双向绑定到 state。

- **测**:`TiTableColumn` 在 playground 白名单里,但在 `ng-components.ts` 的 24 个注册组件里**不存在**,meta bundle 也没有它 → 出码只能靠 `hyphenate` 兜底成 `ti-table-column`。这是一条真实存在的可疑路径。
- **期望**:两种结果都有价值 ——
  - 编译通过 → TiTableColumn 确实是 TiTableModule 导出的合法指令,兜底巧合成立(那它和 `NgTemplate` 一样属于"不靠巧合但也没声明"的情况,该写进 README);
  - `NG8001: 'ti-table-column' is not a known element` → **白名单里有个幽灵组件**,要么从白名单删,要么在物料注册表里补。



## T8 · ref 在循环里(@ViewChildren)

> 生成一个「批量编辑」卡片:用 loop 遍历 state 里的用户列表(**循环变量 item、index**),每行一个 TiText 输入,**每个输入都用 props.ref 存进 refs,键写成 `refs.inputs[index]`**(按循环下标逐个存)。

- **测**:循环内 ref → `@ViewChildren('inputs') inputs!: QueryList<ElementRef>` + 订阅 `changes` + `.toArray()` 整组写进 refs;且下标必须**正好是循环索引变量**才成立。
- **期望**:产物用 `@ViewChildren` + `QueryList`,类体里**没有** `@ViewChild('inputs')`;4201 里 `refs.inputs` 是数组、长度等于行数。
- **变体(值得单独再跑一轮)**:把提示词改成「每个输入用同一个 ref 名字存进 refs,不要下标」→ 期望出码器**按 README §2 的门槛丢弃**这个 prop,而不产出 N 个迭代争抢同一个 `@ViewChild` 的残缺代码。

## T9 · condition

> 生成一个「概览」卡片:state 里放一个 showDetail 布尔值和一批统计数据;统计区块总是显示,详情区块**只在 showDetail 为 true 时显示(用节点的 condition 字段控制,不要用 CSS 隐藏)**;卡片里放一个 TiSwitch 双向绑定 showDetail,用来切换详情区块。

- **测**:`condition` → `*ngIf`。**6 个示例里一个 condition 都没有**,AI 不会自发写,提示词必须点名"用节点的 condition 字段"。
- **期望**:产物里出现 `*ngIf="state.showDetail"`。
- **顺带看一件事**:若 AI 把 `condition` 和 `loop` 加在**同一个节点**上,产物会是同一元素两个结构型指令 → 编译必然报错。那属于出码器该不该拦的问题,记下来。


## T12 · Text 节点上的属性被丢(实测确认的静默丢弃点)

> 生成一个「账单明细」表格卡片:每行显示项目名和金额,**金额用 Text 组件展示**(不要用原生 span),并且**点击金额时用 `console.log` 打印这一行的项目名**。

- **测**:`Text` 节点上除 `text` / `style` 外的属性一律丢弃 —— 这是实测确认过的静默丢弃点(仓库里的 `mock/schema.json` 就是这么踩的:它把 `onClick` 挂在循环节点的 `Text` 子节点上,整份产物逐字不变)。
- **期望**:编译通过;产物里金额是 `{{ item.amount }}`,**没有** `(click)`;4201 里点金额**没反应**。
- **这条要当成产品问题记**:可观察的功能丢失,且编译期完全静默。

## T13 · 内置组件 Img / Text(靠 hyphenate 巧合)

> 生成一个「商品展示」卡片:用 **Img** 内置组件放一张商品图(用真实地址),下面用 **Text** 显示商品名和价格。

- **测**:`Img` / `Slot` 这两个内置组件**不在物料注册表里**,只能靠 `hyphenate('Img')` → `img` 的巧合成立。README 只声明了 `NgTemplate` 不依赖这个巧合,`Img`/`Slot` 没有声明。
- **期望**:产物里是原生 `<img src="..." />`;`Text`(非根节点)走 `generateTextNode`,产出 `{{ ... }}` 而**不产出标签**;编译通过。若报 `NG8001` 则巧合不成立。


## T14 · 未覆盖组件群 C(属性型宿主:TiTextArea / TiCheckbox / TiRadio)

> 生成一个「工单提交」卡片:用 **TiTextArea** 让用户填问题描述(占位提示「请描述你遇到的问题」,3 行,最多 200 字);下面放一个 **TiCheckbox** 写「同意服务条款」;再放一组性别单选,用**两个 TiRadio** 分别写「男」「女」,**共用同一个 state 字段**(不要用 TiRadioGroup);最后用 **TiCheckboxGroup** 多选「影响范围」。所有输入都双向绑定到 state。根节点用 TiCard 包。

- **测**:`TiTextArea` / `TiCheckbox` / `TiRadio` 是全仓库**既没有示例、也没有任何 T 段**碰过的三个组件(唯一的三不管地带);外加**属性型宿主与 group 共用同一个 Module 的去重**(两只 TiRadio + TiRadioGroup → 一个 TiRadioModule;TiCheckbox + TiCheckboxGroup → 一个 TiCheckboxModule)。
- **期望**:`<textarea tiTextarea …>` / `<input tiCheckbox …>` / `<input tiRadio …>` —— 原生标签 + 宿主属性,来自 [ng-components.ts](genui-sdk/packages/materials/angular-opentiny-ng/src/materials/components/ng-components.ts) 顶部那 5 行 monkey-patch;imports 里 `TiTextareaModule` / `TiCheckboxModule` / `TiRadioModule` **各只出现一次**。
- **已实测**(手写同形状 schema 走 `ng build code-generator-preview`):上面两条全部成立,gate 2.2 秒通过。
- **顺带盯一个静默语义点**:meta bundle 给 TiTextArea 的 prop 名是 `maxlength`(小写),而 `TiTextareaComponent` 自己的 input 是 `maxLength`(驼峰)——所以 `[maxlength]="200"` 落在**原生 textarea** 上,编译能过,但组件的字数计数(`hasMaxlength` / `countLength`)拿不到它。4201 里专门看字数计数,别只看输入框能不能打字。

## T15 · TiTabs + TiTab(示例里只有静态版本)

> 生成一个「商品详情」卡片:用 **TiTabs** 做页签,**第一个 TiTab 写「详情」并默认激活**,第二个写「参数」,第三个用 loop 遍历 state 里的标签数组生成页签(标题取每个 item 的 name 字段),并给**循环出来的那个页签**挂一个 `onActiveChange`,点击时 `console.log` 出这个标签的名字和序号。根节点用 TiCard 包。

- **测**:`TiTabs` / `TiTab` 只出现在示例 `tabs.json` 里,而那份示例是**纯静态**的 —— 没有 state、没有事件、没有 loop、没有双向绑定。这条 T 段补的正是示例给不了的那半。外加模块别名(`TiTabs` 与 `TiTab` 都走 TiTabModule)。
- **期望**:`<ti-tabs>` + `<ti-tab>`,imports 里 `TiTabModule` 只出现一次;循环那个页签产出 `*ngFor` + `(activeChange)="__handle1(item, index)"`,方法签名带 `item` / `index`(T1 的坑一在这里也会现形)。
- **重点看 `active` 写成单向还是双向**:`active` 在 TiTab 上是**双向绑定**接口(上游注释原文「该接口是双向绑定的」)。若 AI 写成 `[active]="…"`,页签能点、**state 不会回写** → 编译期完全无感,只有 4201 对比才看得出来 —— 属于归因表里最值钱的「两边都编过、渲染不一样」那一格。带 `model: true` 的写法产出 `[(active)]="…"`(已实测)。
- **已实测**:`(activeChange)` 是真实 output(`TiTabComponent` 的 `activeChange` / `beforeActiveChange`,meta bundle 里的 `onActiveChange` / `onBeforeActiveChange` 对得上),不会 NG8002;`id` 也确实是 input(继承自 `TiBaseComponent`),循环里的 `[id]="item.id"` 编得过。手写同形状 schema 走 gate 2.2 秒通过。

## T16 · JSExpression 属性值零转义(实测确认的出码器缺陷)

> 生成一个「权限看板」卡片:state 里放一个 role 字段(初值 admin)和一个查阅人姓名;卡片里放一个 TiText 双向绑定姓名,**当 role 等于 admin 时**才显示一个详情区块(用节点的 condition 字段控制);详情里放一个 TiIcon,把它的 title 设成「查阅人姓名拼上一句后缀」的结果。根节点用 TiCard 包。

- **测**:只要 JSExpression 的值里出现**双引号**,出码器就把它原样塞进双引号包着的模板属性里 → 属性值提前闭合。**这条跟组件无关**,是所有 JSExpression 属性的共性(`[prop]` / `*ngIf` / `[(ngModel)]` 三条路都走同一段拼接)。提示词不用提双引号 —— AI 默认就用双引号写 JS 字符串,自然触发。
- **期望**:产物里出现 `*ngIf="state.role === "admin""` / `[title]="state.name + " 的详情""` 这种一看就知道坏了的东西;gate 报 **`NG5002: Opening tag "…" not terminated.`**(紧跟一条 `NG5002: Unexpected closing tag …`)。
- **已实测**:三种形态(`*ngIf` 里的 `=== "admin"`、`[title]` 里的 `+ " 的结果"`、`[(ngModel)]` 里的 `=== "A" ? …`)都复现;真实 gate 的报错就是上面那两条 NG5002。
- **归因**:渲染器完全不受影响 —— JSExpression 在渲染器里是 `new Function` 的源码,双引号天经地义。所以这是**出码器的锅**。
- **这条要当成产品问题记**:JSExpression 属性值**零转义**,而 AI 用双引号写字符串是默认偏好 —— 也就意味着这个坑在真实使用里不是偶发。换成单引号写就编得过,但这不该由提示词来回避。

## T17 · JSExpression 里的反引号(实测确认:整份产物连 TS 都解析不了)

> 生成一个「订单管理」表格卡片:用 TiTable 展示订单,最后一列放一个 **TiButton** 写「删除」,按钮上的文案要**把这一行的订单号带进去**(比如「删除 A001」这种拼出来的文案),点击时 `console.log` 打印这一行的订单号;每行由 loop 生成。根节点用 TiCard 包。

- **测**:产物是把整份模板塞进一个**反引号模板串**(`template: \`…\``)里的,而 JSExpression 的值原样内联 —— 于是值里只要出现反引号,就把外层那个模板串**提前闭合**。这跟 T16 是同一个根因(JSExpression 零转义),但**破坏力大一档**:T16 只毁一个标签,这条毁掉整个文件。AI 用模板串拼文案是非常自然的写法,提示词不用点名反引号。
- **期望**:产物里出现 `{{ \`删除${row.orderNo}\` }}` 这种「模板串套模板串」;gate 报 **`NG1002: Incorrect number of arguments to @Component decorator`** + `TS1005: ',' expected.` + `TS18004: No value exists in scope for the shorthand property '删除$'`(整串塌成语法垃圾)。
- **已实测**:不是推测 —— **示例 `grid.json` 自己就带着这个地雷**(见下面「示例语料里的两颗地雷」)。拿这份示例直接出码、把产物整份覆盖进 `schema-card.ts` 走 gate,报的就是上面那串错。
- **归因**:渲染器照旧不受影响(它是 `new Function`,模板串本来就该这样写)→ **出码器的锅**。

## 逼不出来、只能手写 schema 的

别再花时间试提示词,这四条从 playground 结构上就出不来:

1. **坑二:非事件函数 prop 引用循环变量** —— 我把 meta bundle 里 26 个条目的 `schema.properties` 全扫了一遍,**一个函数型 prop 都没有**(type 只有 `string / boolean / number / object / array / date / checkbox / radio`)。AI 无从得知哪个 input 吃函数,写出来必然是杜撰的名字 → 报的是 `NG8002`(未知属性),会把真正的信号(`TS2304`,`item` 在类体里悬空)盖掉。用探针库里的 P2 / O2。
2. **数组元素里的协议节点**(`JSSlot` / `JSFunction` 作为数组元素 → 原样吐 JSON)—— 自然语言逼不出来,得手写。
3. **TiModal / TiCardHeader** —— 前者被规则「禁止使用任何弹窗组件」封死,后者在白名单里被注释掉(`// 不好看，别用了`)。要测只能改白名单或手写。
4. **多物料包混合出码** —— playground 一次只启用一个物料库。

---

## 示例语料里的两颗地雷:`grid.json`

`meta.ts` 把 6 份示例**整份 JSON** 喂给 AI(`filterExamples(['form','info','grid','tabs','pagination','refs'])`),所以示例里的问题会直接被学走。`grid.json` 里有两处,都已用真实 gate 复现 —— **这份示例自己出码后是编不过的**:

1. **`TinyButton` 是个不存在的组件**(grid.json:163)。它既不在白名单里,也不在 `ng-components.ts` 的 24 个注册条目里(那里叫 `TiButton`)。出码只能 `hyphenate` 兜底成 `<tiny-button>`,而且**连 import 都不会有** → `NG8001`。AI 看见「表格里放删除按钮」这种形状就会照抄,这条得改示例。
2. **`text` 的值是反引号模板串**(grid.json:176,`` "`删除${row.name}`" ``),原样内联进产物的 `template: \`…\`` → 外层模板串提前闭合。报错不是 NG8001 而是一串语法垃圾(`NG1002` / `TS1005` / `TS18004`,详见 T17)—— 也就是说**第 2 颗雷会把第 1 颗雷的报错盖住**,只改掉反引号的话,`tiny-button` 才会以 `NG8001` 现形。两处要一起修。

**教训**:这 6 份示例过去只进过**字节对比**语料(改前改后逐字相同即可),从没进过 gate —— 「字节稳定」完全不代表「编得过」。示例是喂给 AI 的,它比 T 段更需要过 gate。

---

## 附:24 个组件的选择器真值表(排查产物时对着看)

从 `TINYNG_CONFIG` 实 dump 出来的(`elementSelector` / `attributeSelector` / `moduleRefMap`):

| schema 里写 | 产物里的标签 | 宿主属性 | NgModule |
| --- | --- | --- | --- |
| TiButton | `button` | `tiButton` | TiButtonModule |
| TiCard | `ti-card` | — | TiCardModule |
| TiCardHeader | `ti-card-header` | — | TiCardModule |
| TiCheckbox | `input` | `tiCheckbox` | TiCheckboxModule |
| TiCheckboxGroup | `ti-checkbox-group` | — | TiCheckboxModule |
| TiDate | `ti-date` | — | TiDateModule |
| TiDateRange | `ti-date-range` | — | TiDateRangeModule |
| TiFormField | `ti-formfield` | — | TiFormfieldModule |
| TiIcon | `ti-icon` | — | TiIconModule |
| TiItem | `ti-item` | — | TiFormfieldModule |
| TiModal | **`ti-modal-wrapper`** | — | TiModalModule |
| TiPagination | `ti-pagination` | — | TiPaginationModule |
| TiRadio | `input` | `tiRadio` | TiRadioModule |
| TiRadioGroup | `ti-radio-group` | — | TiRadioModule |
| TiRate | `ti-rate` | — | TiRateModule |
| TiSelect | `ti-select` | — | TiSelectModule |
| TiSlider | `ti-slider` | — | TiSliderModule |
| TiSwitch | `ti-switch` | — | TiSwitchModule |
| TiTab | `ti-tab` | — | TiTabModule |
| TiTable | `ti-table` | — | TiTableModule |
| TiTabs | `ti-tabs` | — | TiTabModule |
| TiText | `input` | `tiText` | TiTextModule |
| TiTextArea | `textarea` | `tiTextarea` | TiTextareaModule |
| TiUpload | `ti-upload` | — | TiUploadModule |

两个容易看错的地方:

- **`TiModal` 的标签是 `ti-modal-wrapper`**,不是 `ti-modal` —— 靠 `hyphenate` 猜会猜错(规则禁弹窗,所以只在手写 schema 时会遇到)。
- 5 个属性型组件(`TiButton` / `TiText` / `TiTextArea` / `TiRadio` / `TiCheckbox`)的原生标签来自 `ng-components.ts` 顶部那 5 行 monkey-patch(`ɵcmp.selectors[0][0] = 'button'` 等)。**这段 patch 一旦与上游 @opentiny/ng 的 selector 形状漂移,出码就会静默产出不存在的标签**,而 T2–T4 正是盯这条的。

**组件覆盖盘点**(对着这份表排 T 段时用):6 个示例里出现过的组件只有 10 个 —— `TiButton` / `TiText` / `TiSelect` / `TiDate` / `TiTable` / `TiPagination` / `TiTabs` / `TiTab` / `TiCard` / `TiRadio`(`grep -o '"componentName": "Ti[A-Za-z]*"' examples/*.json | sort | uniq -c`),其余 14 个 AI 不会自发写。这 14 个里的 12 个在 T2–T13 里点过名,**`TiCheckbox` 与 `TiTextArea` 是补 T14 之前仅有的两个既无示例、又无 T 段的组件**;`TiTabs` / `TiTab` 虽有示例但只覆盖静态形态,由 T15 补。补完 T14 / T15 后,24 个注册组件里除 `TiModal` 与 `TiCardHeader` 外**全部至少被示例或某个 T 段覆盖一次**。
