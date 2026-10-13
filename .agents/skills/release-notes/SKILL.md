---
name: release-notes
description: >-
  Generate and publish formatted GitHub Release Notes for opentiny/genui-sdk.
  Compares the new tag with the previous stable release, fetches PRs, polishes
  titles, formats notes by area and change type, and writes the result to
  releaseNote.md at the repo root. Use when the user asks to create release
  notes, publish a release, or prepare a changelog for genui-sdk.
---

# Genui SDK Release Notes

为 [opentiny/genui-sdk](https://github.com/opentiny/genui-sdk) 生成并发布 Release Notes。

## 前置检查

执行前确认：

1. **GitHub CLI**：`gh auth status` 已通过。若未安装或未登录，用 AskQuestion 询问用户：
   - 是否安装并登录 `gh`（推荐，可自动拉取 PR 与发布）
   - 或手动提供：新 tag、上一正式版 tag、GitHub 自动生成的 Release notes 原文
2. **Tag 信息**：明确本次发布的 tag（如 `v1.3.0`）
3. **上一正式版**：不含 `alpha` / `beta` 的最近 tag（如 `v1.2.0`）。用 `git tag --sort=-v:refname` 筛选

```text
正式版判定：匹配 ^v\d+\.\d+\.\d+$，排除 alpha/beta 预发布
```

## 工作流

```text
进度：
- [ ] 1. 确定 new_tag 与 previous_tag
- [ ] 2. 拉取 PR 列表与原始 Release notes
- [ ] 3. 修复 PR 标题的语法错误并进行适当润色
- [ ] 4. 提炼 Highlights、按规则分类并格式化
- [ ] 5. 写入 releaseNote.md 并请用户确认
- [ ] 6. 发布 Release
```

### Step 1：确定版本

```bash
git fetch --tags
git tag --merged <new_tag> --sort=-v:refname \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | grep -vx '<new_tag>'
```

- `new_tag`：用户指定或最新待发布 tag
- `previous_tag`：上述列表第一条（已合入 new_tag、且排除自身的最近正式版）

### Step 2：拉取 PR 数据

优先用本 skill 目录下的脚本：

```bash
scripts/fetch-release-data.sh <new_tag> <previous_tag>
```

脚本输出 JSON，包含 `new_tag`、`previous_tag`、`full_changelog_url`、`new_contributors`、`github_notes`，以及 `pull_requests` 数组，其中每个 PR 含 `number`、`title`、`author`、`url`、`files`、`commits`。

若无 `gh`，备选方案：

```bash
git log <previous_tag>..<new_tag> --pretty=format:'%s%n%b'
```

或请用户从 [新建 Release 页](https://github.com/opentiny/genui-sdk/releases/new) 选择 tag、对比 `previous_tag` 后，将 GitHub 自动生成的 notes 粘贴到对话中。

也可用 GitHub API（需 `GH_TOKEN`）：

```bash
gh api repos/opentiny/genui-sdk/releases/generate-notes \
  -f tag_name='<new_tag>' -f previous_tag_name='<previous_tag>' \
  -f configuration_file_path='.github/release.yml' 2>/dev/null || true
```

### Step 3：语法修复与润色

对每条 PR 标题做英文语法纠正，规则：

- 保持 conventional commit 前缀与 scope 不变（如 `feat(playground):`、`fix(core):`）
- 只修正语法、大小写、措辞，不改变技术含义
- 同一 PR 多条 commit 时，分别润色每条描述

### Step 4：分类与格式化

#### Highlights 摘要

在标题之后、Features 之前撰写 3–7 条 Highlights，提炼本版本的主线变更：

- 每条以 **粗体主题** 起头，简述变更与影响，末尾用括号附主要 PR 编号
- 将关联 PR 归并为一组（如「多框架渲染」「生命周期增强」），不要逐条罗列所有 PR
- 仅收录有用户可见影响或架构意义的变更；纯 chore / ci 不进 Highlights
- 格式：`- **{主题}** - {描述} (#xxx, #yyy).`

#### 变更类型（第一级）

| 前缀 / 类型 | 章节 |
|------------|------|
| `feat` | ✨ Features |
| `fix` | 🐛 Bug Fixes |
| `refactor` | ♻️ Refactor |
| `docs`、`ci`、`build`、`test`、纯测试描述 | 🔧 Other Changes |

**例外**（不论前缀，归入 Other Changes 对应子区）：

- `sites/homepage` 或 scope 含 `homepage` → **Site**
- `packages/benchmarks` 或标题含 `benchmarks` → **Benchmarks**
- `docs/` 或 `docs:` → **Docs**
- `.github/`、`ci:`、`build(` → **Build**
- 测试相关 → **Test**

#### 区域（第二级子标题）

按 PR 改动路径与标题 scope 判定，优先级从高到低：

| 子区 | 判定条件 |
|------|---------|
| **Benchmarks** | `packages/benchmarks` |
| **Site** | `sites/homepage`、`(homepage)` |
| **Docs** | `docs/`、`docs:` |
| **Build** | `.github/`、`ci:`、`build(` |
| **Test** | 测试文件或标题为测试用例补充 |
| **Playground** | `sites/playground`、`(playground)`、`genui-template`、`template`（非 homepage） |
| **Components** | `packages/`、`projects/` 中其余改动 |

#### 条目格式

```text
- {润色后的标题} by @{author} in https://github.com/opentiny/genui-sdk/pull/{number}
```

同一 PR 有多条独立 commit 需分别列出时，末尾追加 commit hash：

```text
- {标题} by @{author} in https://github.com/opentiny/genui-sdk/pull/{number} - {full_sha}
```

注意：`in` 与 URL 之间保留空格；有 hash 时用 ` - ` 分隔。

#### 文档结构

```markdown
# Genui SDK v{version} Release Notes

## 🚀 Highlights

- **{主题}** - {描述} (#xxx, #yyy).
- ...

---

## ✨ Features

**Components**
- ...

**Playground**
- ...

---

## 🐛 Bug Fixes

**Components**
- ...

---

## ♻️ Refactor

...

---

## 🔧 Other Changes

**Test**
- ...

**Build**
- ...

**Docs**
- ...

**Site**
- ...

**Benchmarks**
- ...

---

## 🎉 New Contributors

- @{login} made their first contribution in https://github.com/opentiny/genui-sdk/pull/{number}

**Full Changelog**: https://github.com/opentiny/genui-sdk/compare/{previous_tag}...{new_tag}
```

规则：

- 标题保留 `v` 前缀（如 `Genui SDK v1.2.0 Release Notes`）
- 子区按固定顺序：Components → Playground → Test → Build → Docs → Site → Benchmarks
- 空子区省略；空章节省略
- 大章节之间用 `---` 分隔
- **Highlights**：标题后、Features 前放 3–7 条主线变更；每条以 **粗体主题** 起头，简述影响并附主要 PR 编号；仅收录有用户可见影响或架构意义的变更，纯 chore / ci 不进 Highlights
- **New Contributors**：取自脚本输出的 `new_contributors`（字段为 `login`、`number`），格式为 `- @{login} made their first contribution in https://github.com/opentiny/genui-sdk/pull/{number}`；无首次贡献者则省略整个章节
- **Full Changelog**：固定取脚本输出的 `full_changelog_url`，置于文档最末

完整示例见 [examples.md](examples.md)。

### Step 5：写入文件并确认

将格式化后的 Release Notes **写入仓库根目录 `releaseNote.md`**（覆盖已有内容），并在对话中展示全文请用户确认。

```bash
# 输出路径（固定）
releaseNote.md
```

规则：

- 每次整理完成后必须写入 `releaseNote.md`，不要只输出到对话或 `/tmp`
- 用户反馈调整后，同步更新 `releaseNote.md`
- 确认无误后再进入发布步骤

### Step 6：发布

**CLI 发布（推荐）**：

```bash
git push origin <new_tag>

gh release create <new_tag> \
  --verify-tag \
  --title "Genui SDK <new_tag>" \
  --notes-file releaseNote.md \
  --repo opentiny/genui-sdk
```

预发布版本加 `--prerelease`。

**网页发布**：用户确认后，引导打开 [releases/new](https://github.com/opentiny/genui-sdk/releases/new)，选择 tag、粘贴 `releaseNote.md` 内容、点击 Publish。

## 常见问题

| 情况 | 处理 |
|------|------|
| `gh` 未安装 | 询问用户安装，或用手动粘贴 GitHub 生成的 notes；整理结果仍写入 `releaseNote.md` |
| 无 `.github/release.yml` | 直接用 `fetch-release-data.sh` 或 `git log` 从提交信息提取 PR 编号 |
| 同一 PR 跨多个区域 | 按主要改动区域归类；多 commit 可拆成多条 |
| dependabot 等机器人 PR | 归入 Other Changes > Build，或按用户要求忽略 |
| `releaseNote.md` 已存在 | 直接覆盖为本次整理结果 |
