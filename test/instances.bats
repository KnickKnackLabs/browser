#!/usr/bin/env bats

load helpers

setup() {
  setup_browser_on_path
  unset GIT_AUTHOR_EMAIL
}

teardown() {
  if [ -n "${unrelated_pid:-}" ] && kill -0 "$unrelated_pid" 2>/dev/null; then
    kill "$unrelated_pid"
  fi
}

@test "list works without identity and leaves unmanaged files untouched" {
  printf 'unmanaged\n' > "$BROWSER_RUNTIME_DIR/unmanaged.json"
  run browser list
  [ "$status" -eq 0 ]
  [[ "$output" == *"No browser instances running"* ]]
  [ -f "$BROWSER_RUNTIME_DIR/unmanaged.json" ]
}

@test "close requires an explicit browser ID" {
  run browser close
  [ "$status" -ne 0 ]
}

@test "close refuses a malformed record without removing it" {
  printf '{}\n' > "$BROWSER_RUNTIME_DIR/b-test.json"
  run browser close b-test
  [ "$status" -ne 0 ]
  [ -f "$BROWSER_RUNTIME_DIR/b-test.json" ]
}

@test "close cleans a stopped instance without signaling a PID" {
  printf '%s\n' '{"version":1,"id":"b-test","pid":999999999,"profile":null,"endpoint":"ws://127.0.0.1:1/devtools/browser/test"}' > "$BROWSER_RUNTIME_DIR/b-test.json"
  run browser close b-test
  [ "$status" -eq 0 ]
  [[ "$output" == *"already stopped"* ]]
  [ ! -e "$BROWSER_RUNTIME_DIR/b-test.json" ]
}

@test "close does not signal a live PID when its browser endpoint is unavailable" {
  sleep 30 > /dev/null 2>&1 &
  unrelated_pid=$!
  printf '{"version":1,"id":"b-test","pid":%s,"profile":null,"endpoint":"ws://127.0.0.1:1/devtools/browser/test"}\n' "$unrelated_pid" > "$BROWSER_RUNTIME_DIR/b-test.json"

  run browser close b-test
  [ "$status" -ne 0 ]
  kill -0 "$unrelated_pid"
  [ -f "$BROWSER_RUNTIME_DIR/b-test.json" ]
}

@test "instance lookup rejects traversal and external endpoints" {
  run node --input-type=module -e '
    import assert from "node:assert/strict";
    import { writeFile } from "node:fs/promises";
    import { join } from "node:path";
    import { pathToFileURL } from "node:url";
    const modulePath = join(process.env.REPO_DIR, "scripts/instances.mjs");
    const { instanceFile, readInstance } = await import(pathToFileURL(modulePath));
    assert.throws(() => instanceFile("../../escape"));
    await writeFile(instanceFile("b-test"), JSON.stringify({
      version: 1, id: "b-test", pid: 1,
      endpoint: "ws://example.com:9222/devtools/browser/test",
    }));
    await assert.rejects(readInstance("b-test"), /Invalid browser record/);
  '
  [ "$status" -eq 0 ]
}
