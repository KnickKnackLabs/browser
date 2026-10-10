#!/usr/bin/env bats

load helpers

@test "resolve_agent extracts agent from GIT_AUTHOR_EMAIL" {
  export GIT_AUTHOR_EMAIL="k7r2@ricon.family"
  source "$REPO_DIR/lib/identity.sh"
  [ "$AGENT" = "k7r2" ]
}

@test "resolve_agent extracts agent with hyphenated name" {
  export GIT_AUTHOR_EMAIL="baby-joel@ricon.family"
  source "$REPO_DIR/lib/identity.sh"
  [ "$AGENT" = "baby-joel" ]
}

@test "resolve_agent fails without identity" {
  unset GIT_AUTHOR_EMAIL
  run bash -c '
    git() { return 1; }
    export -f git
    source "'"$REPO_DIR"'/lib/identity.sh"
  '
  [ "$status" -ne 0 ]
  [[ "$output" == *"No agent identity"* ]]
}

@test "resolve_agent rejects path traversal in agent name" {
  export GIT_AUTHOR_EMAIL="../../etc@ricon.family"
  run bash -c 'source "'"$REPO_DIR"'/lib/identity.sh"'
  [ "$status" -ne 0 ]
  [[ "$output" == *"Invalid agent name"* ]]
}

@test "pid_file_for_id returns correct path" {
  setup_identity --isolate-home
  result="$(pid_file_for_id "b-a1f3")"
  [ "$result" = "/tmp/browser-id-b-a1f3.json" ]
}

@test "pid_file_for_agent returns correct path" {
  setup_identity --isolate-home
  result="$(pid_file_for_agent)"
  [ "$result" = "/tmp/browser-test-agent.json" ]
}

@test "pid_file_for_agent accepts agent argument" {
  setup_identity --isolate-home
  result="$(pid_file_for_agent "other-agent")"
  [ "$result" = "/tmp/browser-other-agent.json" ]
}

@test "cache_dir returns browser cache path" {
  setup_identity --isolate-home
  result="$(cache_dir)"
  [[ "$result" == *"/.cache/browser" ]]
}

@test "screenshot_dir returns correct path" {
  setup_identity --isolate-home
  result="$(screenshot_dir)"
  [ "$result" = "/tmp/browser-screenshots" ]
}

@test "PLAYWRIGHT_BROWSERS_PATH is set" {
  setup_identity --isolate-home
  [ -n "$PLAYWRIGHT_BROWSERS_PATH" ]
  [[ "$PLAYWRIGHT_BROWSERS_PATH" == *"/.cache/browser" ]]
}
