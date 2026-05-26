#!/usr/bin/env bash
# GenUI SDK — Agentic 改造完成度验证
# 用法: bash scripts/ai-verify.sh
# 仅报告、不因未完成特性失败: AI_VERIFY_STRICT=0 bash scripts/ai-verify.sh
# 顺带执行 ai-init: AI_VERIFY_RUN_INIT=1 bash scripts/ai-verify.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

STRICT="${AI_VERIFY_STRICT:-1}"
RUN_INIT="${AI_VERIFY_RUN_INIT:-0}"

info() { echo -e "${CYAN}[ai-verify]${NC} $*"; }
ok() { echo -e "${GREEN}[ai-verify] OK:${NC} $*"; }
warn() { echo -e "${YELLOW}[ai-verify] WARN:${NC} $*"; }
fail() { echo -e "${RED}[ai-verify] FAIL:${NC} $*" >&2; exit 1; }

info "工作目录: $ROOT"
echo ""

# --- 工件存在性 ---
REQUIRED=(
  AGENTS.md
  ai-spec.md
  ai-features.json
  ai-progress.md
  ai-review.md
  scripts/ai-init.sh
  scripts/ai-verify.sh
  docs/inner-docs/AI_HARNESS.md
  docs/inner-docs/ai-harness-prompts.md
  .cursor/rules/genui-harness.mdc
)

MISSING=0
for f in "${REQUIRED[@]}"; do
  if [[ -e "$f" ]]; then
    ok "工件存在: $f"
  else
    warn "工件缺失: $f"
    MISSING=$((MISSING + 1))
  fi
done
echo ""

[[ "$MISSING" -eq 0 ]] || fail "缺少 $MISSING 个 Harness 工件"

command -v node >/dev/null 2>&1 || fail "需要 node 以解析 ai-features.json"

# --- 解析特性清单 ---
REPORT="$(node <<'NODE'
const fs = require('fs');
const path = 'ai-features.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const features = data.features || [];
const done = features.filter((f) => f.passes === true);
const pending = features.filter((f) => f.passes !== true);
const doneNoEvidence = done.filter((f) => !f.evidence || String(f.evidence).trim() === '');

const byPriority = (list) => {
  const order = { P0: 0, P1: 1, P2: 2 };
  return [...list].sort(
    (a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
  );
};

console.log('HARNESS_LEVEL=' + (data.meta?.harness_level || 'unknown'));
console.log('TOTAL=' + features.length);
console.log('DONE_COUNT=' + done.length);
console.log('PENDING_COUNT=' + pending.length);
console.log('DONE_NO_EVIDENCE=' + doneNoEvidence.length);

console.log('---DONE---');
for (const f of byPriority(done)) {
  console.log(f.id + '\t' + f.priority + '\t' + f.category + '\t' + f.description);
}

console.log('---PENDING---');
for (const f of byPriority(pending)) {
  console.log(f.id + '\t' + f.priority + '\t' + f.category + '\t' + f.description);
  if (f.commands?.length) {
    console.log('  commands: ' + f.commands.join(' ; '));
  }
}

console.log('---DONE_NO_EVIDENCE---');
for (const f of doneNoEvidence) {
  console.log(f.id);
}
NODE
)"

HARNESS_LEVEL="$(echo "$REPORT" | sed -n 's/^HARNESS_LEVEL=//p' | head -1)"
TOTAL="$(echo "$REPORT" | sed -n 's/^TOTAL=//p' | head -1)"
DONE_COUNT="$(echo "$REPORT" | sed -n 's/^DONE_COUNT=//p' | head -1)"
PENDING_COUNT="$(echo "$REPORT" | sed -n 's/^PENDING_COUNT=//p' | head -1)"
DONE_NO_EVIDENCE="$(echo "$REPORT" | sed -n 's/^DONE_NO_EVIDENCE=//p' | head -1)"

info "Harness 档位: $HARNESS_LEVEL"
info "特性进度: ${DONE_COUNT}/${TOTAL} 已完成, ${PENDING_COUNT} 未完成"
echo ""

print_section() {
  local title="$1"
  local marker="$2"
  echo -e "${CYAN}## ${title}${NC}"
  sed -n "/^---${marker}---$/,/^---/p" <<< "$REPORT" | tail -n +2 | sed '/^---/d' | while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if [[ "$line" == commands:* ]]; then
      echo "    $line"
    else
      echo "  - $line"
    fi
  done
  echo ""
}

print_section "已完成" "DONE"
print_section "待完成" "PENDING"

if [[ "$DONE_NO_EVIDENCE" -gt 0 ]]; then
  warn "以下已通过特性缺少 evidence:"
  sed -n '/^---DONE_NO_EVIDENCE---$/,/^---/p' <<< "$REPORT" | tail -n +2 | sed '/^---/d' | while read -r id; do
    [[ -n "$id" ]] && echo "    - $id"
  done
  echo ""
fi

# --- 可选：运行 ai-init ---
if [[ "$RUN_INIT" == "1" ]]; then
  info "执行 scripts/ai-init.sh ..."
  bash scripts/ai-init.sh
  echo ""
fi

# --- 结论 ---
if [[ "$PENDING_COUNT" -eq 0 ]] && [[ "$DONE_NO_EVIDENCE" -eq 0 ]]; then
  ok "Agentic 改造验收完成（全部特性 passes + evidence 齐全）"
  echo ""
  echo "  Harness 就绪: yes"
  echo "  改造完成:     yes"
  exit 0
fi

if [[ "$PENDING_COUNT" -eq 0 ]]; then
  warn "全部特性已 passes，但 ${DONE_NO_EVIDENCE} 条缺少 evidence"
else
  info "Harness 基础设施: 就绪（若 ai-init.sh 通过）"
  info "代码库 AI 友好改造: 进行中（${PENDING_COUNT} 条待验收）"
fi

echo ""
echo "  下一步: 实现 ai-features.json 中优先级最高的 P0/P1 待办项"
echo "  冷启动: 新 Agent 仅读 AGENTS.md → bash scripts/ai-init.sh"
echo ""

if [[ "$STRICT" == "0" ]]; then
  warn "AI_VERIFY_STRICT=0，退出码强制为 0"
  exit 0
fi

if [[ "$PENDING_COUNT" -gt 0 ]] || [[ "$DONE_NO_EVIDENCE" -gt 0 ]]; then
  fail "Agentic 改造尚未完成（待办 ${PENDING_COUNT}，缺 evidence ${DONE_NO_EVIDENCE}）"
fi

exit 0
