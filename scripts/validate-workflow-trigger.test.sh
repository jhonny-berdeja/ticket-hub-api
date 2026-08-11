#!/usr/bin/env bash
# Test harness for validate-workflow-trigger.sh, applied to the real
# publish workflow (design ADR-1 / spec: Master-only trigger; Threat
# Matrix: Untrusted trigger surface). Table-driven, mirrors the style of
# infra-hub/scripts/validate-image-tag.test.sh.
#
# RED phase: fails because .github/workflows/publish-image.yml does not
# exist yet. GREEN phase: passes once the workflow is created with
# exactly `on: push: branches: [master]`.
#
# Also exercises the checker against synthetic fixtures to prove it
# actually rejects a broadened trigger surface, not just "file exists".
#
# Run: bash scripts/validate-workflow-trigger.test.sh
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CHECKER="$SCRIPT_DIR/validate-workflow-trigger.sh"
REAL_WORKFLOW="$REPO_ROOT/.github/workflows/publish-image.yml"

pass=0
fail=0

if [ ! -f "$CHECKER" ]; then
  echo "FAIL: $CHECKER does not exist yet (expected in RED phase)"
  exit 1
fi

# --- Real workflow: must exist and pass the master-only check ---
if [ ! -f "$REAL_WORKFLOW" ]; then
  echo "FAIL (expected in RED phase): $REAL_WORKFLOW does not exist yet"
  fail=$((fail + 1))
else
  if "$CHECKER" "$REAL_WORKFLOW" >/dev/null 2>&1; then
    echo "PASS: $REAL_WORKFLOW trigger surface is master-only"
    pass=$((pass + 1))
  else
    echo "FAIL: $REAL_WORKFLOW trigger surface is NOT master-only"
    "$CHECKER" "$REAL_WORKFLOW"
    fail=$((fail + 1))
  fi
fi

# --- Synthetic fixtures: prove the checker rejects a broadened surface ---
FIXTURE_DIR="$(mktemp -d /tmp/validate-workflow-trigger-fixtures.XXXXXX)"
trap 'rm -rf "$FIXTURE_DIR"' EXIT

assert_reject_fixture() {
  local name="$1" content="$2"
  local f="$FIXTURE_DIR/$name.yml"
  printf '%s\n' "$content" >"$f"
  if "$CHECKER" "$f" >/dev/null 2>&1; then
    echo "FAIL (expected reject): $name -> accepted"
    fail=$((fail + 1))
  else
    echo "PASS (rejected): $name"
    pass=$((pass + 1))
  fi
}

assert_accept_fixture() {
  local name="$1" content="$2"
  local f="$FIXTURE_DIR/$name.yml"
  printf '%s\n' "$content" >"$f"
  if "$CHECKER" "$f" >/dev/null 2>&1; then
    echo "PASS (accepted): $name"
    pass=$((pass + 1))
  else
    echo "FAIL (expected accept): $name -> rejected"
    "$CHECKER" "$f"
    fail=$((fail + 1))
  fi
}

assert_reject_fixture "pull_request_added" 'name: x
on:
  push:
    branches: [master]
  pull_request: {}
jobs: {}'

assert_reject_fixture "workflow_dispatch_added" 'name: x
on:
  push:
    branches: [master]
  workflow_dispatch: {}
jobs: {}'

assert_reject_fixture "wildcard_branches" 'name: x
on:
  push:
    branches: ["**"]
jobs: {}'

assert_reject_fixture "extra_branch" 'name: x
on:
  push:
    branches: [master, develop]
jobs: {}'

assert_reject_fixture "non_master_branch" 'name: x
on:
  push:
    branches: [main]
jobs: {}'

assert_accept_fixture "master_only_flow_style" 'name: x
on:
  push:
    branches: [master]
jobs: {}'

assert_accept_fixture "master_only_block_style" 'name: x
on:
  push:
    branches:
      - master
jobs: {}'

echo ""
echo "Results: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
