# 生成式UI技术要点

## 一、流式输出

### 1. 结构化

#### 1.1 输出类型指定： response_format：'json_object'

指定输出格式为json对象能提高输出json内容质量，需要对应的大模型支持指定，否则需要使用提示词模式引导与约束

OpenAI structure Output API / DeepSeek JSON Output API

```json
{
  "response_format": { "type": "json_object" }
}
```

注意打开`stream: true` 获得流式输出

#### 1.2 未闭合json处理： parseParitalJson

流式输出的内容会遇到json输出了一半等问题，需要通过工具闭合。

AI-SDK 中的 `parsePartialJson`函数 或者 `jsonrepair`库 都可以处理类似的不完整JSON闭合问题。

```ts
import { parsePartialJson } from 'ai';

// or

import { jsonrepair } from 'jsonrepair';
```

同类型的库还有很多，具体使用参考对应文档。

#### 1.3 输出结构指定：jsonSchema <- TinyEngine PageSchema 协议

“TinyEngine页面Schema协议”转化成zodSchema再转化成jsonSchema， 并告诉大模型按这个约束输出json。

DeepSeek中jsonSchema推荐放在promot提示词中； 而 Open AI 支持在`response_format`中指定`json_schema`能够获得更准确的输出。

#### 1.4 其他说明

以上几步，可以直接使用 AI-SDK 提供的 `streamObject`搭配不同的提供商 Provider，能在支持指定response format输出的大模型下实现流式输出并自动转 JSON Object。

如果使用文本流`textStream`作为流式输出的格式（比较省传输流量），则可以搭配 1.2 提到的工具处理。

### 2. 物料与约束

#### 2.1 组件信息提取

bundle.json + built-in.json + chart.json 提供了丰富的组件信息，通过工具脚本处理可以提取出对应的组件信息（名称、属性、事件、Snippet片段）

#### 2.2 卡片示例（增删查改 + 列表）

通过卡片示例，大模型输出能够正常模拟：表单的输出输出结构，卡片信息展示结构，确认框、列表展示结构、分类Tab展示等等

#### 2.3 约束条件

- **组件白名单**， 部分组件不适合中对话交互场景使用
- **特殊组件约束**，比如文本需要使用Text组件等包裹
- **调节想象力**，比如允许使用mock数据

  1.4、2.1、2.2、2.3 几个小节共同组成 Prompt

### 3. 不规范输出处理

尽管约束输出json，仍有大模型输出的内容为“大段内容+json markdown分隔符 + json内容 + json markdown分隔符号 + 大段结束语”，利用分隔符号可以提取中间的json避免工具处理失效。

## 二、 流式渲染

### 1. 增量渲染 JsonDiffPatch

TinySchemaRenderer渲染器重复渲染会有一定的性能卡顿问题，通过提取增量填充回去渲染有利于卡片性能。

JsonDiffatch 提取 Delta 再重新把 Delta 赋值给原对象，能做到：

1. 维持内存地址不变
2. 更新增量变化

### 2. 缓冲与完整性处理 requiredCompleteFieldSelectors + jsonSelectorMatcher

**背景：**
部分值应为枚举值、函数体等，局部输出渲染无意义，需要提供完整值

**思路：**
利用JsonDiffPatch，提取Delta信息，如果Delta含有该属性，则推迟至下一个属性开始更新的时候把上一个属性完整地更新一次。

**工具：**

1.  Delta -> JsonPath 转化算法
2.  JsonSelector匹配语法

- 增强语法：
  - `^=` 、`*=`、`$=` 属性匹配
  - `>` 子选择符
  - `*` 通配符

3.  getAccurateDelta 部分更新算法

**配置规则：**
needCompelteKeys

**举例解析：**

```ts
const requiredCompleteFieldSelectors = [
  '[componentName=Img] > props > src', // 图片地址必须完整，片段的地址无意义
  'componentName', // 组件名属于枚举值，片段的组件名无意义
  'style', // 样式不完整会发生抖动，颜色等有奇奇怪怪的流式刷新变化
  '[type=JSFunction] > value', // 函数体的片段无意义，不能被解析和使用
  '[type=JSExpression] > value', // 表达式的片段无意义，解析后可能会结果错误
  'type', // 类型属于枚举值，片段的类型无意义
  '[componentName=TinyTabItem] > props > name', // Tab页签名字片段会引起解析错误，无意义
  '[componentName^=TinyChart] > props > *', // 图表的各项属性片段会引起图表报错
];
```

**附加：**
流式输出接收结束后，最后再刷新一次，防呆

更多缓冲延迟更新算法请参考附录 [《附录：基于Json Diff Delta的属性完整性缓冲延迟更新策略与算法》](./generative-ui-delay-update.md)

### 3. 响应式渲染修复

1. 渲染器

- watchEffect再setSchema后引发死循环
- children渲染空对象边Null问题
- VNode 告警问题, 子节点要返回插槽函数而不是节点

2. 组件问题

- 表格Columns从吴遍数组组件不响应 —— TinyVue发Patch版本解决
- 下拉Select option不支持从null变熟组，需要默认先织为空熟组，组件侧修改比较复杂 —— Wrap组件解决

3. 其他问题

- 双向绑定无效问题，通过表单示例提醒要加 `model: true` 解决
- `[Object, Object]`显示问题， `{type: 'jsExpression', value: 'xxx'}` 流式渲染无`value`会当作对象 —— 添加到完整性校验里
- state 和 UI 表单modelValue绑定填写问题，需要前置state， 后生成State会导致边生成UI过程中尝试填写表单直接报错 —— 未解决

## 三、交互优化

### 1. 对话延续交互 （ContextAPI 上下文交互）

- 提供ContextAPI，支持触发下轮对话；
- Button -> ActionButton（内置点击后触发下轮对话并带上state数据）

### 2.多页签自动切换交互 （UI自动跟随功能）

- TinyTab -> WrapTinyTab
- 监听子插槽长度，长度变更刷新ActiveTab值，实现自动切换到最后的活动页签

### 3. 样式优化

- scoped + custom.css
- 部分组件间距问题优化等

举例：

- **TinyCard**：固定宽度在对话框中显示不美观，因此覆写了宽度，使其自适应容器
- **TinyRow**：调整行高，提升在对话框中的视觉层次感
