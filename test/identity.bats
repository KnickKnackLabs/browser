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

@test "auth_dir returns new-style path" {
  setup_identity
  result="$(auth_dir)"
  [[ "$result" == *"/.config/browser/test-agent" ]]
}

@test "auth_file returns new-style path for nonexistent file" {
  setup_identity
  result="$(auth_file "github.com")"
  [[ "$result" == *"/.config/browser/test-agent/github.com.json" ]]
}

@test "auth_file falls back to legacy path when it exists" {
  setup_identity
  local legacy_dir="$HOME/.config/shimmer/browser/test-agent"
  mkdir -p "$legacy_dir"
  echo '{}' > "$legacy_dir/example.com.json"

  result="$(auth_file "example.com" 2>/dev/null)"
  [[ "$result" == *"/shimmer/browser/test-agent/example.com.json" ]]

  rm -rf "$legacy_dir"
}

@test "auth_file prefers new path over legacy when both exist" {
  setup_identity
  local new_dir="$HOME/.config/browser/test-agent"
  local legacy_dir="$HOME/.config/shimmer/browser/test-agent"
  mkdir -p "$new_dir" "$legacy_dir"
  echo '{"new": true}' > "$new_dir/both.com.json"
  echo '{"old": true}' > "$legacy_dir/both.com.json"

  result="$(auth_file "both.com" 2>/dev/null)"
  [[ "$result" == *"/.config/browser/test-agent/both.com.json" ]]

  rm -rf "$new_dir" "$legacy_dir"
}

@test "ensure_auth_dir creates directory" {
  setup_identity
  local dir="$(ensure_auth_dir)"
  [ -d "$dir" ]
  [[ "$dir" == *"/.config/browser/test-agent" ]]
  rmdir "$dir" 2>/dev/null || true
}

@test "pid_file_for_id returns correct path" {
  setup_identity
  result="$(pid_file_for_id "b-a1f3")"
  [ "$result" = "/tmp/browser-id-b-a1f3.json" ]
}

@test "pid_file_for_agent returns correct path" {
  setup_identity
  result="$(pid_file_for_agent)"
  [ "$result" = "/tmp/browser-test-agent.json" ]
}

@test "pid_file_for_agent accepts agent argument" {
  setup_identity
  result="$(pid_file_for_agent "other-agent")"
  [ "$result" = "/tmp/browser-other-agent.json" ]
}

@test "cache_dir returns browser cache path" {
  setup_identity
  result="$(cache_dir)"
  [[ "$result" == *"/.cache/browser" ]]
}

@test "screenshot_dir returns correct path" {
  setup_identity
  result="$(screenshot_dir)"
  [ "$result" = "/tmp/browser-screenshots" ]
}

@test "PLAYWRIGHT_BROWSERS_PATH is set" {
  setup_identity
  [ -n "$PLAYWRIGHT_BROWSERS_PATH" ]
  [[ "$PLAYWRIGHT_BROWSERS_PATH" == *"/.cache/browser" ]]
}
