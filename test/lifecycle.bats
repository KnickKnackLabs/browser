#!/usr/bin/env bats

load helpers

setup() {
  setup_browser_on_path
  export BROWSER_PROFILES_DIR="$BATS_TEST_TMPDIR/profiles"
  export SESSION_IMPORT_LOG="$BATS_TEST_TMPDIR/imports"
  export PROBE="$REPO_DIR/test/fixtures/session-probe.mjs"
  unset GIT_AUTHOR_EMAIL
  cache="${XDG_CACHE_HOME:-$HOME/.cache}/browser"
  [ -d "$cache" ] || skip 'Requires Chromium: mise run setup'
}

teardown() {
  browser close-all --all
}

@test "a named profile persists login state and rejects duplicate use" {
  browser profile:create rentals
  id="$(browser launch --profile rentals)"

  browser run --browser "$id" "$PROBE" set
  run browser launch --profile rentals
  [ "$status" -ne 0 ]
  [[ "$output" == *"already in use by $id"* ]]

  browser close "$id"
  id="$(browser launch --profile rentals)"
  browser run --browser "$id" "$PROBE" expect-saved
  run browser run --browser "$id" "$PROBE" fail
  [ "$status" -ne 0 ]
  [[ "$output" == *"Injected workflow failure"* ]]
  browser content --browser "$id" body
  screenshot="$(browser screenshot --browser "$id")"
  [ -s "$screenshot" ]
  browser close "$id"

  [ -d "$BROWSER_PROFILES_DIR/rentals/data" ]
  [ ! -e "$BROWSER_PROFILES_DIR/rentals/running.json" ]
  [ "$(wc -l < "$SESSION_IMPORT_LOG" | tr -d ' ')" = 3 ]
}

@test "temporary instances and separate profiles isolate session state" {
  id="$(browser launch --temporary)"
  browser run --browser "$id" "$PROBE" set
  browser close "$id"
  id="$(browser launch --temporary)"
  browser run --browser "$id" "$PROBE" expect-empty
  browser close "$id"

  browser profile:create separate
  id="$(browser launch --profile separate)"
  browser run --browser "$id" "$PROBE" expect-empty
  browser close "$id"

  browser run "$PROBE" set
  browser run "$PROBE" expect-empty
}

@test "concurrent launches of one profile permit exactly one browser" {
  browser profile:create shared
  for attempt in 1 2; do
    (
      if browser launch --profile shared > "$BATS_TEST_TMPDIR/id-$attempt" 2> "$BATS_TEST_TMPDIR/error-$attempt"; then
        echo 0 > "$BATS_TEST_TMPDIR/status-$attempt"
      else
        echo 1 > "$BATS_TEST_TMPDIR/status-$attempt"
      fi
    ) &
  done
  wait

  first="$(< "$BATS_TEST_TMPDIR/status-1")"
  second="$(< "$BATS_TEST_TMPDIR/status-2")"
  [ "$((first + second))" = 1 ]

  run browser list
  [ "$status" -eq 0 ]
  [ "$(printf '%s\n' "$output" | grep -c 'profile=shared')" = 1 ]
}

@test "an abandoned profile reservation fails closed without deleting state" {
  browser profile:create reserved
  printf '%s\n' '{"id":"b-abandoned","pid":999999999}' > "$BROWSER_PROFILES_DIR/reserved/running.json"
  run browser launch --profile reserved
  [ "$status" -ne 0 ]
  [[ "$output" == *"reserved by another browser or launch"* ]]
  [ -f "$BROWSER_PROFILES_DIR/reserved/running.json" ]
  [ -d "$BROWSER_PROFILES_DIR/reserved/data" ]
}

@test "launch refuses implicit or contradictory profile choices" {
  run browser launch
  [ "$status" -ne 0 ]
  [[ "$output" == *"Choose exactly one"* ]]

  run browser launch --profile rentals --temporary
  [ "$status" -ne 0 ]
  [[ "$output" == *"Choose exactly one"* ]]
}
