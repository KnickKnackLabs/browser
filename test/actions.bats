#!/usr/bin/env bats

load helpers

setup() {
  setup_identity
  setup_browser_on_path

  export NODE_LOG="$BATS_TEST_TMPDIR/node.log"
  cat > "$BATS_TEST_TMPDIR/mock-bin/node" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$NODE_LOG"
SH
  chmod +x "$BATS_TEST_TMPDIR/mock-bin/node"
}

logged_argument_count() {
  local expected="$1"
  awk -v expected="$expected" '$0 == expected { count++ } END { print count + 0 }' "$NODE_LOG"
}

@test "screenshot keeps viewport capture as the default" {
  run browser screenshot --browser b-test
  [ "$status" -eq 0 ]
  [ "$(logged_argument_count --action)" -eq 1 ]
  [ "$(logged_argument_count screenshot)" -eq 1 ]
  [ "$(logged_argument_count --full-page)" -eq 0 ]
}

@test "screenshot forwards full-page capture explicitly" {
  run browser screenshot --browser b-test --full-page
  [ "$status" -eq 0 ]
  [ "$(logged_argument_count --full-page)" -eq 1 ]
}

@test "scroll forwards signed horizontal and vertical deltas" {
  run browser scroll --browser b-test --x 120 --y -640
  [ "$status" -eq 0 ]
  [ "$(logged_argument_count --action)" -eq 1 ]
  [ "$(logged_argument_count scroll)" -eq 1 ]
  [ "$(logged_argument_count --x)" -eq 1 ]
  [ "$(logged_argument_count 120)" -eq 1 ]
  [ "$(logged_argument_count --y)" -eq 1 ]
  [ "$(logged_argument_count -640)" -eq 1 ]
}
