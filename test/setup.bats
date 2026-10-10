#!/usr/bin/env bats

load helpers

@test "all tasks are executable and use strict shell handling" {
  task_files="$(find "$REPO_DIR/.mise/tasks" -type f)"
  while IFS= read -r task; do
    assert_file_executable "$task"
    assert_file_contains 'set -euo pipefail' "$task" "$(basename "$task") missing strict shell handling"
  done <<< "$task_files"
}

@test "public commands no longer expose auth snapshot persistence" {
  setup_browser_on_path
  for task in login save-auth load-auth status; do
    run browser "$task" --help
    [ "$status" -ne 0 ]
    [[ "$output" == *"no task $task found"* ]]
  done
  run browser run --help
  [ "$status" -eq 0 ]
  [[ "$output" != *"--site"* ]]
}

@test "run stops before script resolution when argument parsing fails" {
  setup_browser_on_path
  mock_bin="$BATS_TEST_TMPDIR/parser-bin"
  mkdir -p "$mock_bin"
  cat > "$mock_bin/xargs" <<'BASH'
#!/usr/bin/env bash
echo 'Injected argument parser failure' >&2
exit 42
BASH
  chmod +x "$mock_bin/xargs"
  export PATH="$mock_bin:$PATH"

  run browser run missing-script argument
  [ "$status" -ne 0 ]
  [[ "$output" == *"Injected argument parser failure"* ]]
  [[ "$output" == *"Failed to parse script arguments."* ]]
  [[ "$output" != *"Script not found"* ]]
}

@test "browser controls require an explicit instance instead of inferring identity" {
  setup_browser_on_path
  export GIT_AUTHOR_EMAIL='../../invalid@ricon.family'
  run browser goto https://example.test
  [ "$status" -ne 0 ]
  [[ "$output" == *"Pass --browser ID"* ]]
}

@test "close-all requires explicit approval" {
  setup_browser_on_path
  run browser close-all
  [ "$status" -ne 0 ]
  [[ "$output" == *"Use --all"* ]]
}
