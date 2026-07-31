# 文风与结构规范

从 [v1.2.0](https://juejin.cn/post/7651799134606262308)、[v1.1.0](https://juejin.cn/post/7623604104619491334) 提炼的写作约束。流程与自检见 [SKILL.md](SKILL.md)。

## 产品介绍（前言固定段）

可微调标点，核心信息保持一致；不要自行添加未核实的能力声明（如某框架渲染器「已发布」）：

> GenUI SDK 是 OpenTiny 团队基于生成式 UI 理念打造的解决方案，旨在增强大模型显示与交互效果。SDK 提供完整的前后端一体化集成能力，遵循 OpenAI 规范；内置 Vue 与 Angular 双框架渲染器，支持自定义的组件库、交互行为与主题样式。既能快速从零搭建一个 AI 对话应用，也可以在现有业务系统中嵌入生成式 UI 能力。

## 链接块（前言末尾）

```markdown
开源地址：[github.com/opentiny/genui-sdk](https://github.com/opentiny/genui-sdk)（欢迎 Star ⭐）

官方网站：[opentiny.design/genui-sdk](https://opentiny.design/genui-sdk)
```

## 标题风格

- 带情绪钩子，且**每版换新**，不复用上一版标题的钩子
- 点名 `GenUI SDK` + 版本号（`vX.Y.Z`）
- 用 `+` 或「与 / 双升级」串联 2～3 个主题关键词
- 关键词优先用开发者能秒懂的**收益词**（物料可插拔 / 一键切换 / 一站式演练），少用纯工程术语（独立发包 / 解耦 / Delta Patch）；工程词可进正文，但别堆在标题里
- 措辞尊重既有定调：如果某主题已定名（如「渲染器能力增强」），不要私自升级成更夸张的说法（如「真交互」暗示以前不能交互）
- 控制在约 40 字以内，兼顾掘金、公众号列表 / 分享展示

## 总览写法

- 每个主题一个小标题（加粗，可带 emoji：📦 ⚡ 🚀 🛡️）
- bullet 写「能力 + 价值」，一句一事
- 包名、API、字段用反引号
- 不贴 PR 链接或 `@author`

## 详解写法

推荐节奏：

1. 一句话场景 / 痛点，用具体场景代入（如「LLM 流式输出时常省略默认属性，组件容易半残」），不写泛泛的「此前存在一些问题」
2. 本版怎么做（机制、API、配置）
3. 收益或用法（代码 / 表格 / 步骤）
4. 配图或占位

分寸感按读者角色区分：

- **接入向章节**（Core、物料、渲染器）：给 import、组件用法、Schema 片段，让人复制就能跑
- **体验向章节**（Playground、演练场特性）：只讲「有什么、在哪用、怎么用」，不写内部实现（内部函数名、存储键名、卡片 type 之类一律不出现）

需要数据时（包体积、降幅等）必须来自用户或可复现测量，禁止虚构。代码示例中的导出名、包名、子路径、API 签名必须先核对源码（SKILL.md Step 2），未核实的不写。

涉及实验开关时写清文件路径与变量名，例如：

```bash
# sites/playground/web/env/.env
VITE_ENABLE_TEMPLATE=true
```

## 「其他值得关注的修复」写法

只放**升级用户可感知的存量问题**：跨版本存在的流式稳定性、解析容错、作用域、SSE 兼容等。格式：

```markdown
**能力名**

此前……（问题）

vX.Y.Z ……（做法与效果）
```

不要放本迭代新增、同迭代又修掉的问题（筛选规则见 SKILL.md Step 1）。条目不足 3 条可整节省略。

## 配图与占位

- 有图：`![简短说明](url-or-path)`
- 无图：独立一行写 `【占位：一句话说明拍什么】`，不要用 `![...](待补充)`（预览会渲染成破图）
- 全文占位不超过 **5 处**，只留给文字 / 表格说不清的内容（架构图、操作录屏、UI 截图）
- 在对话中同步一份配图清单（位置 / 建议内容 / 格式）

## 总结段模板

```markdown
## 总结

GenUI SDK v{version} 以**{主题1}、{主题2}、{主题3}**为核心升级方向。

欢迎各位开发者升级体验。使用过程中若遇到边界场景或有优化建议，欢迎通过 [GitHub Issues](https://github.com/opentiny/genui-sdk/issues) 反馈；也欢迎 Star 与参与贡献。我们将持续迭代打磨更优质的 GenUI 产品能力！

详细变更列表可参考 Release Note：[github.com/opentiny/genui-sdk/releases/tag/v{version}](https://github.com/opentiny/genui-sdk/releases/tag/v{version})
```

## 关于 OpenTiny NEXT（固定结尾）

几乎原文保留：

```markdown
## 关于 OpenTiny NEXT

OpenTiny NEXT 是一套企业智能前端开发解决方案，以生成式 UI 和 WebMCP 两大核心技术为基础，对现有传统的 TinyVue 组件库、TinyEngine 低代码引擎等产品进行智能化升级，构建出面向 Agent 应用的前端 NEXT-SDKs、AI Extension、TinyRobot智能助手、GenUI等新产品，实现AI理解用户意图自主完成任务，加速企业应用的智能化改造。

欢迎加入 OpenTiny 开源社区。添加微信小助手：opentiny-official 一起参与交流前端技术～
OpenTiny 官网：<https://opentiny.design>
GenUI SDK 代码仓库：<https://github.com/opentiny/genui-sdk> （欢迎star ⭐）

如果你也想要共建，可以进入代码仓库，找到 good first issue标签，一起参与开源贡献~如果你有任何问题，欢迎在评论区留言交流！
```

## 禁忌

- 不写成 changelog 翻译（避免 `feat(core): ... by @xxx in #123`）；逐条 feat 配一句话、缺乏场景串联的也算
- 不贴未在源码核实的代码 / 包名 / API（宁可少贴，不可贴错）
- 不夸大未合并 / 未发布能力（npm 上查不到的不说「已发布」）
- 不把同迭代新增又修掉的问题写进「其他值得关注的修复」
- 不省略「关于 OpenTiny NEXT」
- 不用英文为主文；专有名词可保留英文
