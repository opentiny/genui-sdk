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
set -uo pipefail

# 触发单个仓库的 Pages 部署并等待完成；失败返回非零（不中断脚本，由调用方决定是否继续）
deploy_repo() {
  local repo="$1" workflow="$2" pre_sleep="$3" preview="$4"
  local head run run_id
  echo "== 部署 ${repo} =="
  [ -n "${pre_sleep}" ] && sleep "${pre_sleep}"
  head=$(gh api "repos/${repo}/git/ref/heads/${BRANCH}" --jq .object.sha) || {
    echo "${repo}: 无法获取分支 ${BRANCH} 的 tip SHA" >&2
    return 1
  }
  gh workflow run "${workflow}" --repo "${repo}" --ref "${BRANCH}" || {
    echo "${repo}: workflow_dispatch 失败" >&2
    return 1
  }
  run_id=""
  for _ in $(seq 1 30); do
    run=$(gh run list --repo "${repo}" \
      --workflow "${workflow}" \
      --branch "${BRANCH}" \
      --commit "${head}" \
      --limit 1 \
      --json databaseId,url \
      --jq '.[0] // empty')
    run_id=$(echo "${run}" | jq -r '.databaseId // empty')
    [ -n "${run_id}" ] && break
    sleep 2
  done
  if [ -z "${run_id}" ]; then
    echo "${repo}: 未找到刚 dispatch 的 run" >&2
    return 1
  fi
  echo "${repo} run: $(echo "${run}" | jq -r .url)"
  gh run watch "${run_id}" --repo "${repo}" --exit-status || {
    echo "${repo}: 部署失败，run ${run_id}" >&2
    return 1
  }
  echo "${repo} preview: ${preview}"
  open "${preview}" 2>/dev/null || xdg-open "${preview}" 2>/dev/null || true
}

# --- docs（独立容错块；先 sleep 20 抢断同组 pages 里先跑的 Build docs）---
DOCS_OK=0
deploy_repo "opentiny/docs" "Deploy to github.io" 20 "https://opentiny.github.io/docs/genui-sdk/" \
  && DOCS_OK=1 \
  || echo "docs 部署失败，继续执行 opentiny.design" >&2

# --- opentiny.design（独立容错块）---
DESIGN_OK=0
deploy_repo "opentiny/opentiny.design" "Deploy home to github.io" "" "https://opentiny.github.io/opentiny.design/" \
  && DESIGN_OK=1 \
  || echo "design 部署失败" >&2

# 汇总：任一失败整体返回非零，便于上层感知
[ "${DOCS_OK}" = "1" ] && [ "${DESIGN_OK}" = "1" ]
```

## 规则

- **必须** `--ref "${BRANCH}"`，勿默认打到 `dev`/`main`（除非用户明确要求）
- docs 的 Deploy **先 `sleep 20` 再触发**，用后来者取消机制抢断同组 `pages` 里的 Build docs；design 不需要此延迟
- 触发前记下分支 tip SHA，用 `--commit` 轮询到刚 dispatch 的 run 再 `watch`，避免拿到旧 run
- docs / design 是两个**独立容错块**：任一仓任一步失败只记录原因并继续下一仓（不要 `set -e` 整体退出），与 SKILL.md「一仓失败时尽量完成另一仓」一致
- `gh run watch --exit-status` 失败视为该仓部署失败：回报 run URL，**不要**打开该仓的过期预览
- 可串行或并行触发后再分别 `watch`；`gh run list` 须按 branch + workflow + commit 过滤
- 打开浏览器前先打印预览 URL；无 GUI 时把预览 URL 发给用户
- 功能分支部署会覆盖该仓当前 GitHub Pages，按现有工作流执行
