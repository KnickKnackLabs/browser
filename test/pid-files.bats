#!/usr/bin/env bats

load helpers

setup() {
  setup_identity
  cleanup_pid_files
}

teardown() {
  cleanup_pid_files
}

@test "new-style PID files use browser- prefix" {
  local id_file="$(pid_file_for_id "test-001")"
  local agent_file="$(pid_file_for_agent)"

  [[ "$id_file" == "/tmp/browser-id-test-001.json" ]]
  [[ "$agent_file" == "/tmp/browser-test-agent.json" ]]
}

@test "PID file naming doesn't use shimmer prefix" {
  local id_file="$(pid_file_for_id "test-002")"
  local agent_file="$(pid_file_for_agent)"

  [[ "$id_file" != *"shimmer"* ]]
  [[ "$agent_file" != *"shimmer"* ]]
}

@test "list task handles no running browsers" {
  run mise -C "$REPO_DIR" run list
  [ "$status" -eq 0 ]
  [[ "$output" == *"No browser instances running"* ]]
}

@test "close task handles no running browser for agent" {
  run mise -C "$REPO_DIR" run close
  [ "$status" -eq 0 ]
  [[ "$output" == *"No browser running"* ]]
}

@test "close task handles nonexistent browser ID" {
  run mise -C "$REPO_DIR" run close "b-nonexistent"
  [ "$status" -eq 0 ]
  [[ "$output" == *"already closed"* ]]
}

@test "close-all handles no running browsers" {
  run mise -C "$REPO_DIR" run close-all
  [ "$status" -eq 0 ]
  [[ "$output" == *"No browsers running"* ]]
}
