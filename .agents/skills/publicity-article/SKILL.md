---
name: publicity-article
description: >-
  Write GenUI SDK version publicity articles for 掘金, 公众号, and other platforms
  from release notes. Extracts highlight themes, drafts catchy titles, and
  produces a full Chinese marketing post with overview, feature deep-dives, and
  OpenTiny NEXT footer. Use when the user asks for a 宣传文章, 版本推广文,
  掘金文章, 公众号文章, publicity article, or marketing post for a genui-sdk release.
---

# GenUI SDK 版本宣传文章

为 [opentiny/genui-sdk](https://github.com/opentiny/genui-sdk) 撰写版本宣传文章，面向掘金、公众号及其他技术社区。

参考既往文章：[v1.2.0](https://juejin.cn/post/7651799134606262308)、[v1.1.0](https://juejin.cn/post/7623604104619491334)。

分工：本文件只写**流程**；文风、固定文案、各章节写法与禁忌以 [style-guide.md](style-guide.md) 为唯一事实源；成稿骨架见 [examples.md](examples.md)。三者内容不互相重复。

```
进度：
- [ ] 1. 确认版本与素材，筛选有价值变更
- [ ] 2. 核实代码事实（包名 / 导出 / 子路径 / API 签名）
- [ ] 3. 提炼主题方向
- [ ] 4. 拟定标题与导语
- [ ] 5. 撰写全文并写入 publicity-article.md
- [ ] 6. 终稿自检 + 输出配图清单
```

## Step 1：确认版本与素材

1. 确认本次宣传的 tag（如 `v1.3.0`）。
2. 素材按优先级取用：仓库根目录 `releaseNote.md`（对应本版本时）→ GitHub Release（`gh release view <tag> --repo opentiny/genui-sdk --json name,body,url`）→ 都没有则先走 `release-notes` 技能生成。

**变更筛选**（决定文章写什么，比怎么写更影响质量）：

- Features 优先；对体验有感知的 Bug Fixes / Refactor 进「其他值得关注的修复」；Docs / Site / Build / CI / dependabot 不展开（除非用户点名）
- **同一迭代内新增又修掉的问题不写**：若某 fix 修的是本版新特性（如本版新增 `refs`，同版又修流式空 `ref` 报错），读者在稳定版从未踩过，写出来反而像自曝，留给 Release Note；只写升级用户可感知的存量问题修复
- **打 patch 修的不写**：改动落在 `patches/` 目录（pnpm patchedDependencies）的修复只在本仓库生效，SDK 用户升级拿不到，不能当作版本能力宣传。拿不准时用 `git show --stat <merge-commit>` 看该 fix 改了哪些文件
- 修复筛完不足 3 条就少写，整节可省略，不硬凑

## Step 2：核实代码事实

文章会贴代码、包名、import 路径与 API 签名，**必须与仓库源码一致**——模型对自家 API 的记忆常出错（臆造导出名、子路径、方法签名），贴错直接误导开发者。写代码片段前逐项核对：

- **包名**：`packages/*/package.json` 的 `name`；注意框架包（`@opentiny/genui-sdk-vue` / `-angular`）与物料包（`@opentiny/genui-sdk-materials-*`）的命名差异
- **导出名**：组件 / 函数 / 类型是否真实导出，看 `src/index.ts` 与 `package.json` 的 `exports`
- **子路径**：`/meta`、`/materials` 这类子路径必须存在于 `exports` map，不凭包名臆测
- **API 签名**：参数顺序与可选字段，读对应 `.ts` 源码确认
- **Schema 字段**：`refs` / `lifeCycles` / `methods` / `state` 等对照 Zod schema（`packages/core/src/protocols/schema.ts`）

```bash
# 例：确认导出与子路径
rg "export" packages/core/src/index.ts
cat packages/materials/vue-element-plus/package.json   # 看 exports map
```

两条红线：

1. 未在源码确认的 API / 包名 / 子路径**不得写入代码示例**，改为文字描述或标「以实际版本为准」
2. **未发布 / 未合并的能力不写**。「已发布」要能在 npm 查到（`npm view <pkg> version`）；仓库里只有构建产物、查无源码与发包记录的，一律不提

## Step 3：提炼主题方向

从变更中归纳宣传主题（不是按 PR 罗列）。数量按变更体量定，相近能力合并、差异大的拆开，勿为凑数硬拆硬并。命名口语化、利益导向：

| 坏（工程日志） | 好（宣传主题） |
|--------------|--------------|
| feat: materials decoupling | 物料可插拔，接入更灵活 |
| fix streaming buffer | 流式渲染更稳 |
| playground A2A / Skills | Playground 能力全面升级 |

每个主题挂若干短 bullet 供「版本特性总览」使用。**同一能力只归属一个主题并只在该处展开**，其他地方最多一句带过（例：Legacy 组件属于物料迁移，就不要在多框架一节再解释一遍）。

**注意归属事实**：框架切换、混用渲染等若实际是演练场特性，就放 Playground 主题下，不要另立「SDK 能力」小节造成结构重叠。

## Step 4：拟定标题与导语

标题公式、收益词要求、字数限制见 style-guide「标题风格」。流程要求：

- 一次给出 2～3 个候选，正文采用最贴合的，其余在对话中备选
- **情绪钩子每版换新**，不复用上一版标题的钩子（连用「这次更新太良心！」会显得模板化）

导语节奏：固定产品介绍句（style-guide）→ 可加 1～2 句场景化铺垫把读者代入痛点 → 宣布版本与主题（加粗主题词，与全文一致）→ 收益词收尾 → 链接块。

## Step 5：按固定结构撰写

章节顺序（名称可微调，顺序不变）：

```markdown
## 前言
## 版本特性总览
## 新特性详解
## 其他值得关注的修复   # 可省略
## 总结
## 关于 OpenTiny NEXT
```

各章节写法、语气、配图占位规范见 style-guide。一条总原则：**不写成 changelog 翻译**，用场景与收益串联，让读者感到「这跟我有关」。

分寸感：面向接入方的章节（Core、物料、渲染器）可以贴 API 与代码；面向体验方的章节（Playground 等）只讲「有什么特性、怎么用」，不讲实现机制与内部命名。

成稿写入仓库根目录 `publicity-article.md`（覆盖同名文件；用户的修改意见同步回写）。

## Step 6：终稿自检与交付

多轮增量修改后文章极易「结构漂移」。初稿完成后、以及**每次较大修改后**，通读全文过一遍：

- [ ] 标题、前言、总览、总结中的主题词一致（数量与措辞对齐）
- [ ] 总览每个 bullet 在详解有落点；详解没有总览未提的大节
- [ ] 同一能力只展开一次，没有两节重复解释
- [ ] 占位统一 `【占位：一句话说明】` 格式，全文不超过 5 处
- [ ] 用户手写 / 手改过的段落未被后续编辑覆盖
- [ ] 新增或改动过的代码块、包名再对一遍源码

对话中交付：选用标题与备选、配图清单（位置 / 建议内容 / 格式）、需用户补充的事实（数据、截图、未确认能力）。**不要**擅自发布到掘金、公众号或其他平台。

## 与 release-notes 技能的关系

| 技能 | 产出 | 受众 |
|------|------|------|
| `release-notes` | `releaseNote.md`（按 PR 分类的变更清单） | 开发者 / GitHub Release |
| `publicity-article` | `publicity-article.md`（主题化叙事） | 掘金 / 公众号读者 |

宣传文以 release notes 为「做了什么」的事实源；代码 / API 类事实以仓库源码为最终事实源（Step 2）。预览特性需标明「预览 / 需开关」并写清开启方式。
