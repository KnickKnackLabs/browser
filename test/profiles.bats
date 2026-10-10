#!/usr/bin/env bats

load helpers

setup() {
  setup_browser_on_path
  export BROWSER_PROFILES_DIR="$BATS_TEST_TMPDIR/profiles"
  unset GIT_AUTHOR_EMAIL
}

@test "profile create works without an agent identity" {
  run browser profile:create rentals
  [ "$status" -eq 0 ]
  [ "$output" = "rentals" ]
  [ -d "$BROWSER_PROFILES_DIR/rentals/data" ]
  [ ! -e "$BROWSER_RUNTIME_DIR/browser-id-rentals.json" ]
}

@test "profile directories exclude group and other access" {
  browser profile:create rentals

  run node -e '
    const fs = require("node:fs");
    for (const path of process.argv.slice(1)) {
      if ((fs.statSync(path).mode & 0o077) !== 0) process.exit(1);
    }
  ' "$BROWSER_PROFILES_DIR" "$BROWSER_PROFILES_DIR/rentals" "$BROWSER_PROFILES_DIR/rentals/data"
  [ "$status" -eq 0 ]
}

@test "profile create refuses duplicates without changing existing data" {
  browser profile:create rentals
  printf 'existing state\n' > "$BROWSER_PROFILES_DIR/rentals/data/state"

  run browser profile:create rentals
  [ "$status" -ne 0 ]
  [[ "$output" == *'already exists'* ]]
  [ "$(< "$BROWSER_PROFILES_DIR/rentals/data/state")" = "existing state" ]
}

@test "profile create rejects unsafe names before creating storage" {
  for name in '../escape' '/absolute' '.' 'two words' '-leading'; do
    run browser profile:create "$name"
    [ "$status" -ne 0 ]
    [ ! -e "$BROWSER_PROFILES_DIR" ]
  done
}

@test "profile names support hyphens underscores and digits" {
  run browser profile:create research_2-test
  [ "$status" -eq 0 ]
  [ -d "$BROWSER_PROFILES_DIR/research_2-test/data" ]
}

@test "profile list is sorted and excludes incomplete directories and symlinks" {
  browser profile:create zillow
  browser profile:create personal
  mkdir "$BROWSER_PROFILES_DIR/incomplete"
  ln -s "$BROWSER_PROFILES_DIR/zillow" "$BROWSER_PROFILES_DIR/alias"

  run browser profile:list
  [ "$status" -eq 0 ]
  [ "$output" = $'personal\nzillow' ]
}

@test "profile list on an empty installation does not create storage" {
  run browser profile:list
  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ ! -e "$BROWSER_PROFILES_DIR" ]
}

@test "profile create refuses a symlink without touching its target" {
  mkdir -p "$BROWSER_PROFILES_DIR" "$BATS_TEST_TMPDIR/target"
  ln -s "$BATS_TEST_TMPDIR/target" "$BROWSER_PROFILES_DIR/rentals"

  run browser profile:create rentals
  [ "$status" -ne 0 ]
  [ ! -e "$BATS_TEST_TMPDIR/target/data" ]
}
