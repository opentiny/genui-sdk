# 生成式 UI 实现方案

## 服务端技术方案

- 通过`ai-sdk`的streamObject流式生成结构化数据返回，实现边生成边渲染的流畅体验
- 向`ai-sdk`传入 `tiny-engine`的 jsonSchema，确保生成结果符合组件库规范
- 通过系统提示词约束、优化LLM生成的json-schema，提高生成质量和一致性

### 提示词生成

提示词由6个核心部分组成，形成完整的生成指导体系：

- **提示词前缀**：明确表述目的，让LLM理解需要生成schema的任务
- **组件信息部分**：列出可用组件及其描述、属性、方法等详细信息，为LLM提供组件能力边界
- **返回schema的格式**：定义JSON Schema结构规范，确保输出格式正确
- **一些schema示例**：提供多个完整可渲染的示例，帮助LLM学习最佳实践
- **一些组件组合的片段**：展示常用组件组合模式，如TinyLayout和TinyRow、TinyCol的组合使用
- **具体的约束规则描述**：明确生成规则和限制条件，避免常见错误

这6部分中，除了前缀和约束规则描述为静态内容外，其余部分均为动态生成。系统可直接传递`tiny-engine`中已沉淀的物料信息，经过转换、提取有效信息等处理程序后自动生成，确保提示词与组件库能力保持同步。

另外，这几个部分会分别单独导出，支持灵活组合，便于针对不同场景定制化提示词。

```javascript
let prompt = promptPrefix + '\n';
prompt += genComponentsPrompt(materialsList, whiteList) + '\n';
prompt += genJsonSchemaPrompt(jsonSchema) + '\n';
prompt += genExamplesPrompt(examples) + '\n';
prompt += genSnippetsPrompt(materialsList, whiteList) + '\n';
prompt += rulesPrompt;
```

## UI渲染技术方案

核心是利用了`tiny-schema-renderer` 能够将对应的schema渲染成UI能力，在此基础上进行了多项拓展优化，包括增量更新、字段完整性检查、组件封装等，确保流式生成过程中的渲染稳定性和用户体验。

### 增量更新

利用`tiny-schema-renderer` 能够增量更新的特性，将流式返回前后的`json` 进行diff, 筛选出增量部分。将增量部分传递给`tiny-schema-renderer`做局部的精确更新UI，提升用户感知的流畅度。

### 字段识别、延迟patch技术方案

流式返回过程中，部分字段不完整会导致 schema 渲染报错，如函数表达式、组件名、图片地址等。系统通过"字段完整性检查"机制解决此问题。

**关键字段名单**：定义必须完整的字段路径，未完成时暂不更新。

```javascript
export const requiredCompleteFieldSelectors = [
  '[componentName=Img] > src', // 图片地址必须完整
  'componentName', // 组件名必须完整
  'style', // 样式字符串必须完整
  '[type=JSFunction]value', // 函数代码必须完整
  '[type=JSExpression]value', // 表达式代码必须完整
  'type', // 类型字段必须完整
  '[componentName=TinyTabItem] > name', // Tab项名称必须完整
];
```

**路径匹配算法**：受到css选择器的启发，参考下新创了一套类似的选择器语法，支持复杂的嵌套路径匹配：

- `componentName`：直接匹配字段名
- `[componentName=Img] > src`：匹配组件名为 Img 的元素的 src 属性
- `[type=JSFunction]value`：匹配 type 为 JSFunction 的元素的 value 属性
- 支持 `>` 子选择器、`[attr=value]` 属性选择器等语法

**延迟更新策略**：

1. 计算新旧 schema 的差异（diff）
2. 检查差异中是否包含关键字段
3. 如果包含关键字段且不完整，则丢弃此次更新
4. 如果关键字段完整，则应用更新
5. 生成结束时，强制全量更新确保最终一致性

### 扩展组件，优化体验

一些组件在流式返回的过程中渲染会有问题，因此对部分组件做了wrap，解决流式渲染过程中的问题或者提升组件体验。

**组件封装**：

- **TinyButton**：点击后需要和大模型进行交互，因此封装一层，内置交互逻辑，简化使用复杂度
- **TinySelect组件**：流式渲染过程中option从null变为非空会报错，通过预初始化解决
- **TinyTabs组件**：流式渲染过程中不会自动切到最新的tabItem，增加自动切换逻辑

有些组件样式在对话框中样式需要优化，因此渲染器内置了一些组件样式，优化在对话中的显示效果。

**样式优化**：

- **TinyCard**：固定宽度在对话框中显示不美观，因此覆写了宽度，使其自适应容器
- **TinyRow**：调整行高，提升在对话框中的视觉层次感
