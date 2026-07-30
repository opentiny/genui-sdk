# 触发 GitHub Pages 并打开预览

PR 建好（或追加 commit）后，在 **`${BRANCH}`** 上 `workflow_dispatch`，`watch` 成功后再打开预览。

## 用哪个 Action

| 仓库 | Workflow 名（勿用其它） | 文件 |
|------|-------------------------|------|
| `opentiny/docs` | **Deploy to github.io** | `.github/workflows/deploy-github.yml` |
| `opentiny/opentiny.design` | **Deploy home to github.io** | `.github/workflows/deploy-github.yml` |

不要触发：`Build *`、`Deploy * to Huawei OBS`、`pages-build-deployment`。

## 命令

```bash
# --- docs ---
# 延迟 20s 再触发，便于抢断同 concurrency group（pages）里先跑的 Build docs
sleep 20
gh workflow run "Deploy to github.io" --repo opentiny/docs --ref "${BRANCH}"
sleep 5
DOCS_RUN=$(gh run list --repo opentiny/docs \
  --workflow "Deploy to github.io" \
  --branch "${BRANCH}" \
  --limit 1 \
  --json databaseId,status,url \
  --jq '.[0]')
DOCS_RUN_ID=$(echo "$DOCS_RUN" | jq -r .databaseId)
echo "docs run: $(echo "$DOCS_RUN" | jq -r .url)"
gh run watch "${DOCS_RUN_ID}" --repo opentiny/docs --exit-status

# --- opentiny.design ---
gh workflow run "Deploy home to github.io" --repo opentiny/opentiny.design --ref "${BRANCH}"
sleep 5
DESIGN_RUN=$(gh run list --repo opentiny/opentiny.design \
  --workflow "Deploy home to github.io" \
  --branch "${BRANCH}" \
  --limit 1 \
  --json databaseId,status,url \
  --jq '.[0]')
DESIGN_RUN_ID=$(echo "$DESIGN_RUN" | jq -r .databaseId)
echo "design run: $(echo "$DESIGN_RUN" | jq -r .url)"
gh run watch "${DESIGN_RUN_ID}" --repo opentiny/opentiny.design --exit-status

DOCS_PREVIEW="https://opentiny.github.io/docs/genui-sdk/"
DESIGN_PREVIEW="https://opentiny.github.io/opentiny.design/"
open "${DOCS_PREVIEW}" 2>/dev/null || xdg-open "${DOCS_PREVIEW}" 2>/dev/null || true
open "${DESIGN_PREVIEW}" 2>/dev/null || xdg-open "${DESIGN_PREVIEW}" 2>/dev/null || true
```

## 规则

- **必须** `--ref "${BRANCH}"`，勿默认打到 `dev`/`main`（除非用户明确要求）
- docs 的 Deploy **先 `sleep 20` 再触发**，用后来者取消机制抢断同组 `pages` 里的 Build docs；design 不需要此延迟
- `gh run watch --exit-status` 失败则停，回报 run URL，不要打开过期预览
- 可串行或并行触发后再分别 `watch`；`gh run list` 须按 branch + workflow 过滤
- 无 GUI 时把预览 URL 发给用户
- 功能分支部署会覆盖该仓当前 GitHub Pages，按现有工作流执行
