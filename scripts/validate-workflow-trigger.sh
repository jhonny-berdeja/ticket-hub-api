#!/usr/bin/env bash
# Validates that a workflow file's `on:` trigger block is restricted to
# `push: branches: [master]` only (design ADR-1 / spec: Master-only
# trigger; Threat Matrix: Untrusted trigger surface). Untrusted branches
# and fork PRs must never reach `DOCKERHUB_TOKEN` / `INFRA_HUB_DISPATCH_TOKEN`.
#
# Rejects: any `pull_request` key, any `workflow_dispatch` key, any other
# top-level trigger key besides `push`, and any `branches` value other
# than exactly `master` (flow style `[master]` or block style `- master`).
#
# Usage: validate-workflow-trigger.sh <workflow-file>
# Exit 0: trigger surface is master-only. Exit 1: violation found.
set -u

FILE="${1-}"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "validate-workflow-trigger: workflow file not found: '$FILE'" >&2
  exit 1
fi

# Extract the `on:` block: from the line starting with `on:` up to (but
# not including) the next top-level (column-0) key.
ON_BLOCK="$(awk '
  /^on:/ { capture=1; print; next }
  capture && /^[A-Za-z]/ { exit }
  capture { print }
' "$FILE")"

if [ -z "$ON_BLOCK" ]; then
  echo "validate-workflow-trigger: no 'on:' trigger block found in $FILE" >&2
  exit 1
fi

FAIL=0

if echo "$ON_BLOCK" | grep -qE '^[[:space:]]*pull_request[[:space:]]*:'; then
  echo "validate-workflow-trigger: 'pull_request' trigger is forbidden" >&2
  FAIL=1
fi

if echo "$ON_BLOCK" | grep -qE '^[[:space:]]*workflow_dispatch[[:space:]]*:'; then
  echo "validate-workflow-trigger: 'workflow_dispatch' trigger is forbidden" >&2
  FAIL=1
fi

if ! echo "$ON_BLOCK" | grep -qE '^[[:space:]]*push[[:space:]]*:'; then
  echo "validate-workflow-trigger: 'push' trigger is required" >&2
  FAIL=1
fi

# Branches must be exactly [master] -- either flow style `[master]` or
# block style with a single `- master` item.
BRANCHES_LINE="$(echo "$ON_BLOCK" | grep -E '^[[:space:]]*branches[[:space:]]*:' | head -n1)"
if [ -z "$BRANCHES_LINE" ]; then
  echo "validate-workflow-trigger: 'branches' key not found under 'push'" >&2
  FAIL=1
elif echo "$BRANCHES_LINE" | grep -qE '^[[:space:]]*branches[[:space:]]*:[[:space:]]*\[[[:space:]]*master[[:space:]]*\][[:space:]]*$'; then
  : # flow style, exactly [master] -- OK
else
  # block style: the branches key has nothing after the colon, and the
  # only following indented '- x' line must be exactly '- master'
  BLOCK_ITEMS="$(echo "$ON_BLOCK" | awk '
    found && /^[[:space:]]*-[[:space:]]*/ { print; next }
    found && /^[[:space:]]*[A-Za-z]/ { exit }
    /^[[:space:]]*branches[[:space:]]*:[[:space:]]*$/ { found=1 }
  ')"
  ITEM_COUNT="$(echo "$BLOCK_ITEMS" | sed '/^[[:space:]]*$/d' | wc -l)"
  if [ "$ITEM_COUNT" -ne 1 ] || ! echo "$BLOCK_ITEMS" | grep -qE '^[[:space:]]*-[[:space:]]*master[[:space:]]*$'; then
    echo "validate-workflow-trigger: 'branches' must be exactly [master], found: $BRANCHES_LINE $BLOCK_ITEMS" >&2
    FAIL=1
  fi
fi

# No other top-level trigger keys besides `push` (assumes standard
# 2-space YAML indentation under `on:`, matching this repo's style).
OTHER_KEYS="$(echo "$ON_BLOCK" | grep -E '^[[:space:]]{2}[A-Za-z_]+[[:space:]]*:' | grep -vE '^[[:space:]]{2}push[[:space:]]*:')"
if [ -n "$OTHER_KEYS" ]; then
  echo "validate-workflow-trigger: unexpected trigger key(s) found:" >&2
  echo "$OTHER_KEYS" >&2
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi

exit 0
