---
name: update-docs-pr
description: >-
  After publishing a new @opentiny/genui-sdk package, update opentiny/docs
  (submodule, genui package versions, VitePress sidebar) and opentiny/opentiny.design
  (submodule commit only), then open PRs on branch deploy/update-genui-{version}.
  Use when the user asks to 更新文档工程 or 更新官网工程 or sync docs, update opentiny/docs or opentiny.design,
  or create deploy PRs after a genui-sdk release.
---

# Update docs & opentiny.design PRs

发布 genui-sdk 新版本后，更新以下仓库并自动提 PR：

- [opentiny/docs](https://github.com/opentiny/docs)：submodule + 版本 + 侧栏 → 详见 [docs.md](docs.md)
- [opentiny/opentiny.design](https://github.com/opentiny/opentiny.design)：仅 submodule → 详见 [design.md](design.md)
- 提 PR 后触发 Pages 部署并打开预览 → 详见 [deploy.md](deploy.md)

**不要 clone 整仓。** 一律用 `gh api`。**禁止 force-push**；后续修改在分支上追加 commit。

## 前置检查

1. **版本号**：如 `1.3.0`（去掉 `v`）。`opentiny.design` 不写版本，只共用 `COMMIT`。
2. **鉴权**：`gh auth status`；未登录则提示 `gh auth login` 或提供对两仓有写权限的 token。

```text
COMMIT = 用户指定，否则 opentiny/genui-sdk 远程 main tip
BRANCH = deploy/update-genui-{version}
基线分支（两仓）= dev
```

## 工作流

```text
进度：
- [ ] 1. 确定 version 与 COMMIT
- [ ] 2. 更新 opentiny/docs 并提 PR        → docs.md
- [ ] 3. 更新 opentiny/opentiny.design 并提 PR → design.md
- [ ] 4. 触发 Pages 部署，成功后打开预览   → deploy.md
- [ ] 5. 回报 PR URL、run URL、预览 URL
```

### Step 1：确定 version 与 COMMIT

```bash
if [ -n "${USER_COMMIT}" ]; then
  COMMIT="${USER_COMMIT}"
else
  COMMIT=$(gh api repos/opentiny/genui-sdk/git/ref/heads/main --jq .object.sha)
fi
BRANCH="deploy/update-genui-${version}"
```

- `version`：主要用于分支名与 PR 文案；docs 里各 genui 依赖分别取各自 npm 最新正式版（见 docs.md）
- `COMMIT`：优先用户指定；否则 `main` tip；**两仓共用**；勿再用 tag 覆盖用户指定的 commit

### Step 2–4

按顺序执行并阅读对应文件中的命令与规则：

1. [docs.md](docs.md)
2. [design.md](design.md)
3. [deploy.md](deploy.md)

### Step 5：回报

返回 docs / design 的 PR URL、部署 run URL，以及：

- https://opentiny.github.io/docs/genui-sdk/
- https://opentiny.github.io/opentiny.design/

一仓失败时尽量完成另一仓，并说明原因。

## 常见问题

| 情况 | 处理 |
|------|------|
| 未登录 / 无权限 | `gh auth login` 或提供覆盖两仓的 token |
| 分支已存在 / 改 PR | 以分支 tip 为 parent 追加 commit，无 force PATCH |
| 用户指定了 commit | 两仓都用该 commit |
| docs 无侧栏变更 | 跳过 config.mts |
| design | 只动 `genui-sdk` gitlink |
| 部署失败 | 回报 run URL，不要打开过期预览 |
| 打不开浏览器 | 把预览 URL 发给用户 |
