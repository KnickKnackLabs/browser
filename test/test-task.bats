#!/usr/bin/env bats

load helpers
bats_require_minimum_version 1.5.0

setup() {
  setup_identity
  setup_browser_on_path

  MOCK_DIR="$BATS_TEST_TMPDIR/test-runner-bin"
  BATS_LOG="$BATS_TEST_TMPDIR/bats.log"
  mkdir -p "$MOCK_DIR"
  export BATS_LOG

  cat > "$MOCK_DIR/bats" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
{
  printf 'jobs=%s\n' "${BATS_NUMBER_OF_PARALLEL_JOBS:-}"
  printf 'runner=%s\n' "${BATS_PARALLEL_BINARY_NAME:-}"
  for argument in "$@"; do
    printf 'arg=%s\n' "$argument"
  done
} > "$BATS_LOG"
SH

  cat > "$MOCK_DIR/rush" <<'SH'
#!/usr/bin/env bash
exit 0
SH

  chmod +x "$MOCK_DIR/bats" "$MOCK_DIR/rush"
  export BATS_COMMAND="$MOCK_DIR/bats"
  export RUSH_COMMAND="$MOCK_DIR/rush"
  unset BATS_NUMBER_OF_PARALLEL_JOBS BATS_PARALLEL_BINARY_NAME
}

log_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { print substr($0, length(key) + 2); exit }' "$BATS_LOG"
}

arg_count() {
  local expected="$1"
  awk -F= -v expected="$expected" '$1 == "arg" && substr($0, 5) == expected { count++ } END { print count + 0 }' "$BATS_LOG"
}

@test "test task defaults to four Rush jobs across files" {
  run browser test actions --filter screenshot
  [ "$status" -eq 0 ]
  [[ "$output" == *"4 jobs across files"* ]]
  [ "$(log_value jobs)" = "4" ]
  [ "$(log_value runner)" = "$MOCK_DIR/rush" ]
  [ "$(arg_count --no-parallelize-within-files)" -eq 1 ]
  [ "$(arg_count "$REPO_DIR/test/actions.bats")" -eq 1 ]
}

@test "explicit serial execution does not require Rush" {
  export RUSH_COMMAND="$MOCK_DIR/missing-rush"

  run browser test --jobs 1 actions
  [ "$status" -eq 0 ]
  [[ "$output" == *"BATS parallelism: serial"* ]]
  [ "$(arg_count --no-parallelize-within-files)" -eq 0 ]
}

@test "parallel execution fails clearly without the selected runner" {
  export RUSH_COMMAND="$MOCK_DIR/missing-rush"

  run -127 browser test actions
  [ "$status" -eq 127 ]
  [[ "$output" == *"parallel runner '$MOCK_DIR/missing-rush' is unavailable for 4 jobs"* ]]
  [ ! -e "$BATS_LOG" ]
}

@test "invalid job count fails before BATS" {
  export BATS_NUMBER_OF_PARALLEL_JOBS=lots

  run -2 browser test actions
  [ "$status" -eq 2 ]
  [[ "$output" == *"must be a positive integer"* ]]
  [ ! -e "$BATS_LOG" ]
}
