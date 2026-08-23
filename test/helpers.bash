# Shared test helpers for browser BATS test suite

REPO_DIR="$(cd "$BATS_TEST_DIRNAME/.." && pwd)"
export REPO_DIR
REAL_HOME="$HOME"

# Source identity.sh with a mock agent identity.
# Pass --isolate-home to override $HOME with a tmpdir for unit tests that
# create files under ~/.config/. Omit it for integration tests that invoke
# mise tasks — mise stores its trust database and tool cache under $HOME,
# and overriding it causes trust failures and tool re-installation hangs.
setup_identity() {
  if [ "${1:-}" = "--isolate-home" ]; then
    shift
    export HOME="$BATS_TEST_TMPDIR/home"
    mkdir -p "$HOME"
  fi
  export GIT_AUTHOR_EMAIL="${1:-test-agent@ricon.family}"
  source "$REPO_DIR/lib/identity.sh"
}

# Create a temp directory for test PID/auth files
setup_tmp() {
  export TEST_TMP="$BATS_TEST_TMPDIR/browser-test"
  mkdir -p "$TEST_TMP"
}

# Clean up test PID files from /tmp
cleanup_pid_files() {
  rm -f /tmp/browser-id-test-*.json /tmp/browser-test-*.json
}

# Put a mock `browser` on PATH that delegates to mise.
# Follows the shiv shim pattern so tests use `browser <task>` not `mise run`.
setup_browser_on_path() {
  local mock_bin="$BATS_TEST_TMPDIR/mock-bin"
  mkdir -p "$mock_bin"
  cat > "$mock_bin/browser" <<MOCK
#!/usr/bin/env bash
export BROWSER_CALLER_PWD="\$PWD"
export MISE_TRUSTED_CONFIG_PATHS="$REPO_DIR:$REAL_HOME/.config/mise"
exec mise -C "$REPO_DIR" run -q "\$@"
MOCK
  chmod +x "$mock_bin/browser"
  export PATH="$mock_bin:$PATH"
}

# Assertion helpers (no eval)
assert_file_executable() {
  [ -x "$1" ] || { echo "FAIL: $(basename "$1") is not executable" >&2; return 1; }
}

assert_file_contains() {
  grep -q "$1" "$2" || { echo "FAIL: $3" >&2; return 1; }
}

assert_file_not_contains() {
  ! grep -q "$1" "$2" || { echo "FAIL: $3" >&2; return 1; }
}
