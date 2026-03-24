# Shared test helpers for browser BATS test suite

REPO_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/.." && pwd)"

# Source identity.sh with a mock agent identity
setup_identity() {
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
