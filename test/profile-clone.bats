#!/usr/bin/env bats

load helpers

setup() {
  setup_browser_on_path
  export BROWSER_PROFILES_DIR="$BATS_TEST_TMPDIR/profiles"
}

@test "profile clone copies bytes independently without modifying the source" {
  browser profile:create baseline
  mkdir "$BROWSER_PROFILES_DIR/baseline/data/nested"
  printf 'original\n' > "$BROWSER_PROFILES_DIR/baseline/data/nested/state"

  run browser profile:clone baseline research
  [ "$status" -eq 0 ]
  [ "$output" = research ]
  cmp "$BROWSER_PROFILES_DIR/baseline/data/nested/state" "$BROWSER_PROFILES_DIR/research/data/nested/state"
  printf 'changed\n' > "$BROWSER_PROFILES_DIR/research/data/nested/state"
  [ "$(< "$BROWSER_PROFILES_DIR/baseline/data/nested/state")" = original ]
  [ ! -e "$BROWSER_PROFILES_DIR/baseline/running.json" ]
  [ ! -e "$BROWSER_PROFILES_DIR/research/running.json" ]
}

@test "profile clone refuses existing destinations and self copies" {
  browser profile:create baseline
  browser profile:create existing
  printf 'keep\n' > "$BROWSER_PROFILES_DIR/existing/data/state"

  run browser profile:clone baseline existing
  [ "$status" -ne 0 ]
  [ "$(< "$BROWSER_PROFILES_DIR/existing/data/state")" = keep ]
  [ ! -e "$BROWSER_PROFILES_DIR/baseline/running.json" ]

  run browser profile:clone baseline baseline
  [ "$status" -ne 0 ]
  [[ "$output" == *"must differ"* ]]
}

@test "profile clone refuses reserved sources without creating a destination" {
  browser profile:create baseline
  printf 'existing reservation\n' > "$BROWSER_PROFILES_DIR/baseline/running.json"
  run browser profile:clone baseline research
  [ "$status" -ne 0 ]
  [ ! -e "$BROWSER_PROFILES_DIR/research" ]
  [ "$(< "$BROWSER_PROFILES_DIR/baseline/running.json")" = 'existing reservation' ]
}

@test "profile clone detects dangling native Chromium locks" {
  browser profile:create baseline
  ln -s missing-lock-target "$BROWSER_PROFILES_DIR/baseline/data/SingletonLock"
  run browser profile:clone baseline research
  [ "$status" -ne 0 ]
  [[ "$output" == *"Chromium lock SingletonLock"* ]]
  [ ! -e "$BROWSER_PROFILES_DIR/research" ]
  [ -L "$BROWSER_PROFILES_DIR/baseline/data/SingletonLock" ]
  [ ! -e "$BROWSER_PROFILES_DIR/baseline/running.json" ]
}

@test "profile clone rejects shared symlink state and removes partial copies" {
  browser profile:create baseline
  printf 'outside\n' > "$BATS_TEST_TMPDIR/outside"
  ln -s "$BATS_TEST_TMPDIR/outside" "$BROWSER_PROFILES_DIR/baseline/data/shared"
  run browser profile:clone baseline research
  [ "$status" -ne 0 ]
  [[ "$output" == *"symlink or special file"* ]]
  [ ! -e "$BROWSER_PROFILES_DIR/research" ]
  [ ! -e "$BROWSER_PROFILES_DIR/baseline/running.json" ]
  [ "$(< "$BATS_TEST_TMPDIR/outside")" = outside ]
}

@test "clone library reserves both names and rolls back failed or canceled copies" {
  run node "$REPO_DIR/test/fixtures/clone-boundary-probe.mjs"
  [ "$status" -eq 0 ]
}
