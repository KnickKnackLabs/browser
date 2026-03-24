#!/usr/bin/env bats

load helpers

@test "cache_dir uses XDG_CACHE_HOME when set" {
  export XDG_CACHE_HOME="/tmp/test-xdg-cache"
  setup_identity --isolate-home
  result="$(cache_dir)"
  [ "$result" = "/tmp/test-xdg-cache/browser" ]
  unset XDG_CACHE_HOME
}

@test "cache_dir falls back to HOME/.cache" {
  unset XDG_CACHE_HOME
  setup_identity --isolate-home
  result="$(cache_dir)"
  [[ "$result" == "$HOME/.cache/browser" ]]
}

@test "setup task exists and is executable" {
  [ -x "$REPO_DIR/.mise/tasks/setup" ]
}

@test "all tasks are executable" {
  for task in "$REPO_DIR/.mise/tasks/"*; do
    assert_file_executable "$task"
  done
}

@test "all tasks use set -euo pipefail" {
  for task in "$REPO_DIR/.mise/tasks/"*; do
    assert_file_contains 'set -euo pipefail' "$task" \
      "$(basename "$task") missing set -euo pipefail"
  done
}

@test "tasks source identity.sh (except list, setup, test)" {
  for task in "$REPO_DIR/.mise/tasks/"*; do
    local name=$(basename "$task")
    if [ "$name" = "list" ] || [ "$name" = "setup" ] || [ "$name" = "test" ]; then
      continue
    fi
    assert_file_contains 'source.*identity.sh' "$task" \
      "$name doesn't source identity.sh"
  done
}

@test "run task does not use eval for args" {
  ! grep -q 'eval.*usage_args' "$REPO_DIR/.mise/tasks/run"
}

@test "run task uses safe xargs pattern for variadic args" {
  grep -q 'xargs printf' "$REPO_DIR/.mise/tasks/run"
}

@test "no task references shimmer-browser PID path directly" {
  for task in "$REPO_DIR/.mise/tasks/"*; do
    local name=$(basename "$task")
    # close-all and list intentionally check legacy paths for migration
    if [ "$name" = "close-all" ] || [ "$name" = "list" ]; then
      continue
    fi
    assert_file_not_contains 'shimmer-browser' "$task" \
      "$name references legacy shimmer-browser PID path"
  done
}

@test "scripts reference _paths.mjs not inline path resolution" {
  grep -q "from './_paths.mjs'" "$REPO_DIR/scripts/_cdp.mjs"
  grep -q "from './_paths.mjs'" "$REPO_DIR/scripts/_harness.mjs"
}

@test "launch task uses jq for JSON construction" {
  grep -q 'jq -nc' "$REPO_DIR/.mise/tasks/launch"
}
