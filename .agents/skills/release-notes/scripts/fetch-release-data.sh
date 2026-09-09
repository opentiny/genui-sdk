#!/usr/bin/env bash
set -euo pipefail

NEW_TAG="${1:-}"
PREV_TAG="${2:-}"
REPO="${GITHUB_REPO:-opentiny/genui-sdk}"

if [[ -z "$NEW_TAG" || -z "$PREV_TAG" ]]; then
  echo "Usage: fetch-release-data.sh <new_tag> <previous_tag>" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo '{"error":"gh CLI not found. Install: https://cli.github.com/"}' >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo '{"error":"gh not authenticated. Run: gh auth login"}' >&2
  exit 1
fi

for ref in "$PREV_TAG" "$NEW_TAG"; do
  if ! git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null; then
    echo "{\"error\":\"tag not found: ${ref}\"}" >&2
    exit 1
  fi
done

NOTES=$(gh api "repos/${REPO}/releases/generate-notes" \
  -f "tag_name=${NEW_TAG}" \
  -f "previous_tag_name=${PREV_TAG}" \
  --jq '.body') || {
  echo '{"error":"failed to generate release notes via GitHub API"}' >&2
  exit 1
}

ERR_FILE=$(mktemp)
trap 'rm -f "$ERR_FILE"' EXIT

function is_missing_pr_error() {
  local msg="$1"
  [[ "$msg" =~ [Cc]ould\ not\ resolve\ to\ a\ [Pp]ull[Rr]equest ]] \
    || [[ "$msg" =~ [Nn]ot\ [Ff]ound ]] \
    || [[ "$msg" =~ HTTP[[:space:]]*404 ]]
}

# PRs associated with commits in the release range (covers merge/squash/rebase)
PR_NUMBERS=""
while read -r SHA; do
  [[ -z "$SHA" ]] && continue
  if ! NUMS=$(gh api "repos/${REPO}/commits/${SHA}/pulls" --jq '.[].number' 2>"$ERR_FILE"); then
    echo "error: failed to list PRs for commit ${SHA}: $(cat "$ERR_FILE")" >&2
    exit 1
  fi
  [[ -n "$NUMS" ]] && PR_NUMBERS+="${NUMS}"$'\n'
done < <(git log "${PREV_TAG}..${NEW_TAG}" --pretty=format:'%H')
PR_NUMBERS=$(printf '%s' "$PR_NUMBERS" | sort -un)

PRS='[]'
if [[ -n "$PR_NUMBERS" ]]; then
  PRS='['
  FIRST=true
  for NUM in $PR_NUMBERS; do
    if ! PR_JSON=$(gh pr view "$NUM" --repo "$REPO" --json number,title,author,url,commits,files 2>"$ERR_FILE"); then
      ERR_MSG=$(cat "$ERR_FILE")
      if is_missing_pr_error "$ERR_MSG"; then
        echo "warning: #${NUM} is not a PR or is inaccessible, skipping" >&2
        continue
      fi
      echo "error: failed to fetch PR #${NUM}: ${ERR_MSG}" >&2
      exit 1
    fi
    if $FIRST; then FIRST=false; else PRS+=','; fi
    PRS+="$PR_JSON"
  done
  PRS+=']'
fi

printf '%s' "$PRS" | NEW_TAG="$NEW_TAG" PREV_TAG="$PREV_TAG" REPO="$REPO" NOTES="$NOTES" python3 -c '
import json, os, re, sys

notes = os.environ["NOTES"]
repo = os.environ["REPO"]
new_tag = os.environ["NEW_TAG"]
prev_tag = os.environ["PREV_TAG"]
prs = json.load(sys.stdin)

new_contributors = []
for m in re.finditer(
    r"@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\s+made their first contribution in\s+"
    r"(?:#(\d+)|https?://\S+/pull/(\d+))",
    notes,
):
    new_contributors.append({"login": m.group(1), "number": m.group(2) or m.group(3)})

fc = re.search(r"\*\*Full Changelog\*\*:\s*(https?://\S+)", notes)
full_changelog = fc.group(1) if fc else f"https://github.com/{repo}/compare/{prev_tag}...{new_tag}"

print(json.dumps({
  "new_tag": new_tag,
  "previous_tag": prev_tag,
  "full_changelog_url": full_changelog,
  "new_contributors": new_contributors,
  "github_notes": notes,
  "pull_requests": prs,
}, ensure_ascii=False))
'
