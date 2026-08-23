#!/usr/bin/env bats

load helpers

setup() {
  setup_identity
  setup_browser_on_path
  cleanup_pid_files
}

teardown() {
  cleanup_pid_files
}

@test "new-style PID files use browser- prefix" {
  local id_file="$(pid_file_for_id "test-001")"
  local agent_file="$(pid_file_for_agent)"

  [[ "$id_file" == "$BROWSER_RUNTIME_DIR/browser-id-test-001.json" ]]
  [[ "$agent_file" == "$BROWSER_RUNTIME_DIR/browser-test-agent.json" ]]
}

@test "PID file naming doesn't use shimmer prefix" {
  local id_file="$(pid_file_for_id "test-002")"
  local agent_file="$(pid_file_for_agent)"

  [[ "$id_file" != *"shimmer"* ]]
  [[ "$agent_file" != *"shimmer"* ]]
}

@test "shell and Node PID paths use the isolated runtime directory" {
  run node --input-type=module -e \
    "import { pidFileForId, pidFileForAgent } from 'file://$REPO_DIR/scripts/_paths.mjs'; console.log(pidFileForId('test-003')); console.log(pidFileForAgent('test-agent'));"

  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "$BROWSER_RUNTIME_DIR/browser-id-test-003.json" ]
  [ "${lines[1]}" = "$BROWSER_RUNTIME_DIR/browser-test-agent.json" ]
}

@test "list task uses the isolated runtime directory" {
  local stale_file="$BROWSER_RUNTIME_DIR/browser-id-stale.json"
  printf '%s\n' '{"pid":999999999,"agent":"test-agent","id":"stale"}' > "$stale_file"

  run browser list

  [ "$status" -eq 0 ]
  [ ! -e "$stale_file" ]
  [[ "$output" == *"No browser instances running"* ]]
}

@test "close-all uses the isolated runtime directory" {
  local stale_file="$BROWSER_RUNTIME_DIR/browser-id-stale.json"
  printf '%s\n' '{"pid":999999999,"agent":"test-agent","id":"stale"}' > "$stale_file"

  run browser close-all

  [ "$status" -eq 0 ]
  [ ! -e "$stale_file" ]
  [[ "$output" == *"No browsers running"* ]]
}

@test "list task handles no running browsers" {
  run browser list
  [ "$status" -eq 0 ]
  [[ "$output" == *"No browser instances running"* ]]
}

@test "close task handles no running browser for agent" {
  run browser close
  [ "$status" -eq 0 ]
  [[ "$output" == *"No browser running"* ]]
}

@test "close task handles nonexistent browser ID" {
  run browser close "b-nonexistent"
  [ "$status" -eq 0 ]
  [[ "$output" == *"already closed"* ]]
}

@test "close-all handles no running browsers" {
  run browser close-all
  [ "$status" -eq 0 ]
  [[ "$output" == *"No browsers running"* ]]
}
