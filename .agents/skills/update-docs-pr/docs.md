# 更新 opentiny/docs

从 `dev` 读线上文件，用 Git Data API 在 `${BRANCH}` 上提交并提 PR。

## 读取

```bash
gh api "repos/opentiny/docs/contents/genui/package.json?ref=dev"
gh api "repos/opentiny/docs/contents/.vitepress/config.mts?ref=dev"
gh api "repos/opentiny/docs/contents/genui/genui-sdk?ref=dev" --jq .sha
```

## 改动规则

1. **`genui/package.json`**：只改 `"@opentiny/genui-sdk-vue": "{version}"`。
2. **`.vitepress/config.mts`**：对照 genui-sdk 的 `docs/.vitepress/config/zh-theme.ts`（本仓或 `gh api ...?ref=${COMMIT}`），同步：
   - `sidebar['/genui-sdk/guide/']` / `components/` / `examples/`
   - 文案与结构与 zh-theme 一致；路径沿用 docs 约定（`base: '/genui-sdk/...'` + 相对 `link`），勿原样粘贴 zh-theme 的 `/guide/...`
   - 只改 genui-sdk 相关 sidebar / 必要时 nav；无变更则跳过
3. **`genui/genui-sdk`**：submodule → `${COMMIT}`（`mode=160000` / `type=commit`）

## 提交与 PR

首次可一个 commit；后续在分支 tip 上追加。禁止 force。

```bash
REPO=opentiny/docs

if gh api "repos/${REPO}/git/ref/heads/${BRANCH}" >/dev/null 2>&1; then
  PARENT_SHA=$(gh api "repos/${REPO}/git/ref/heads/${BRANCH}" --jq .object.sha)
else
  PARENT_SHA=$(gh api "repos/${REPO}/git/ref/heads/dev" --jq .object.sha)
fi
BASE_TREE=$(gh api "repos/${REPO}/git/commits/${PARENT_SHA}" --jq .tree.sha)

PKG_BLOB=$(gh api "repos/${REPO}/git/blobs" \
  -f content="$(cat <<'EOF'
{更新后的 package.json 全文}
EOF
)" -f encoding=utf-8 --jq .sha)
# 有侧栏变更时再建 CFG_BLOB

NEW_TREE=$(gh api "repos/${REPO}/git/trees" \
  --input - <<EOF
{
  "base_tree": "${BASE_TREE}",
  "tree": [
    {
      "path": "genui/package.json",
      "mode": "100644",
      "type": "blob",
      "sha": "${PKG_BLOB}"
    },
    {
      "path": "genui/genui-sdk",
      "mode": "160000",
      "type": "commit",
      "sha": "${COMMIT}"
    }
  ]
}
EOF
--jq .sha)
# 有侧栏时 tree 追加 .vitepress/config.mts → CFG_BLOB

NEW_COMMIT=$(gh api "repos/${REPO}/git/commits" \
  -f "message=chore: update genui-sdk to ${version}" \
  -f "tree=${NEW_TREE}" \
  -f "parents[]=${PARENT_SHA}" \
  --jq .sha)

gh api --method POST "repos/${REPO}/git/refs" \
  -f "ref=refs/heads/${BRANCH}" \
  -f "sha=${NEW_COMMIT}" \
|| gh api --method PATCH "repos/${REPO}/git/refs/heads/${BRANCH}" \
  -f "sha=${NEW_COMMIT}"

gh pr create --repo "${REPO}" \
  --base dev \
  --head "${BRANCH}" \
  --title "chore: update genui-sdk to ${version}" \
  --body "$(cat <<EOF
## Summary
- 将 \`genui/genui-sdk\` submodule 更新至 \`${COMMIT}\`（${version}）
- 将 \`@opentiny/genui-sdk-vue\` 依赖更新为 \`${version}\`
- 同步 GenUI SDK 文档侧栏（若有）

## Test plan
- [ ] docs 站点 genui-sdk 文档可正常打开
- [ ] 侧栏链接无 404
- [ ] 依赖版本与 npm 已发布版本一致

EOF
)"
```

同名 PR 已存在则跳过 `gh pr create`，只追加 commit。
