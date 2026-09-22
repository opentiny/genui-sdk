# 更新 opentiny/opentiny.design

**只改 submodule，不改版本号 / package.json / 其它文件。** 与 docs 共用同一 `${COMMIT}`、`${BRANCH}`。

```bash
REPO=opentiny/opentiny.design

gh api "repos/${REPO}/contents/genui-sdk?ref=dev" --jq .sha

if gh api "repos/${REPO}/git/ref/heads/${BRANCH}" >/dev/null 2>&1; then
  PARENT_SHA=$(gh api "repos/${REPO}/git/ref/heads/${BRANCH}" --jq .object.sha)
else
  PARENT_SHA=$(gh api "repos/${REPO}/git/ref/heads/dev" --jq .object.sha)
fi
BASE_TREE=$(gh api "repos/${REPO}/git/commits/${PARENT_SHA}" --jq .tree.sha)

NEW_TREE=$(gh api "repos/${REPO}/git/trees" \
  --input - --jq '.sha' <<EOF
{
  "base_tree": "${BASE_TREE}",
  "tree": [
    {
      "path": "genui-sdk",
      "mode": "160000",
      "type": "commit",
      "sha": "${COMMIT}"
    }
  ]
}
EOF
)

NEW_COMMIT=$(gh api "repos/${REPO}/git/commits" \
  -f "message=chore: update genui-sdk submodule to ${COMMIT}" \
  -f "tree=${NEW_TREE}" \
  -f "parents[]=${PARENT_SHA}" \
  --jq .sha)

gh api --method POST "repos/${REPO}/git/refs" \
  -f "ref=refs/heads/${BRANCH}" \
  -f "sha=${NEW_COMMIT}" \
|| gh api --method PATCH "repos/${REPO}/git/refs/heads/${BRANCH}" \
  -f "sha=${NEW_COMMIT}"

if [ "$(gh pr list --repo "${REPO}" --base dev --head "${BRANCH}" --state open --json number --jq 'length')" = "0" ]; then
  gh pr create --repo "${REPO}" \
    --base dev \
    --head "${BRANCH}" \
    --title "chore: update genui-sdk submodule" \
    --body "$(cat <<EOF
## Summary
- 将 \`genui-sdk\` submodule 更新至 \`${COMMIT}\`

## Test plan
- [ ] homepage / genui-sdk 相关页面可正常构建与打开

EOF
)"
fi
```

禁止 force。
