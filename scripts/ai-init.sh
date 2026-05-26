#!/usr/bin/env bash
# GenUI SDK — Agent Harness 环境检查与冒烟
# 用法: bash scripts/ai-init.sh
# 跳过单测: SKIP_AI_TESTS=1 bash scripts/ai-init.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

fail() { echo -e "${RED}[ai-init] FAIL:${NC} $*" >&2; exit 1; }
ok() { echo -e "${GREEN}[ai-init] OK:${NC} $*"; }

echo "[ai-init] 工作目录: $ROOT"

# --- 仓库根校验 ---
[[ -f package.json ]] || fail "未在仓库根目录（缺少 package.json）"
grep -q '"name": "genui-sdk"' package.json || fail "package.json 不是 genui-sdk 根包"

# --- 工具链 ---
command -v node >/dev/null 2>&1 || fail "未安装 node"
command -v pnpm >/dev/null 2>&1 || fail "未安装 pnpm"

NODE_V="$(node -v)"
PNPM_V="$(pnpm -v)"
ok "node $NODE_V, pnpm $PNPM_V"

# --- Harness 工件 ---
REQUIRED=(
  AGENTS.md
  ai-spec.md
  ai-features.json
  ai-progress.md
  scripts/ai-init.sh
  docs/inner-docs/AI_HARNESS.md
)
for f in "${REQUIRED[@]}"; do
  [[ -e "$f" ]] || fail "缺少 Harness 工件: $f"
done
ok "Harness 工件齐全"

# --- 依赖（轻量检查）---
if [[ ! -d node_modules ]]; then
  echo "[ai-init] WARN: node_modules 不存在，请先执行 pnpm i"
fi

# --- 可选：core 单测 ---
if [[ "${SKIP_AI_TESTS:-}" == "1" ]]; then
  ok "已跳过单测 (SKIP_AI_TESTS=1)"
else
  if pnpm --filter @opentiny/genui-sdk-core test -- --run 2>/dev/null; then
    ok "@opentiny/genui-sdk-core 单测通过"
  else
    echo "[ai-init] WARN: core 单测未通过或脚本不可用（可设 SKIP_AI_TESTS=1 仅检查工件）"
    # 工件检查已通过时仍允许开工，但返回非 0 提醒修复
    exit 1
  fi
fi

ok "环境检查完成，可开始 Agent 会话"
