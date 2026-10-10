#!/usr/bin/env bats

load helpers

setup() {
  export BROWSER_PACKAGE_ROOT="$BATS_TEST_TMPDIR/package"
  export MOCK_INSTALL_ROOT="$BATS_TEST_TMPDIR/mise install"
  unset BROWSER_PATCHRIGHT_PACKAGE_DIR
  local mock_bin="$BATS_TEST_TMPDIR/mock-bin"
  mkdir -p "$mock_bin"
  cat > "$mock_bin/mise" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
[ "$*" = 'where npm:patchright' ]
[ "${MOCK_MISE_FAILURE:-0}" = 0 ] || exit "$MOCK_MISE_FAILURE"
printf '%s\n' "$MOCK_INSTALL_ROOT"
BASH
  chmod +x "$mock_bin/mise"
  export PATH="$mock_bin:$PATH"
  source "$REPO_DIR/lib/patchright.sh"
}

@test "engine initialization supports current mise npm layout" {
  local package_dir="$MOCK_INSTALL_ROOT/node_modules/patchright"
  mkdir -p "$package_dir"

  ensure_patchright_node_module

  [ "$(readlink "$BROWSER_PACKAGE_ROOT/node_modules/patchright")" = "$package_dir" ]
}

@test "engine initialization supports npm global layout" {
  local package_dir="$MOCK_INSTALL_ROOT/lib/node_modules/patchright"
  mkdir -p "$package_dir"

  ensure_patchright_node_module

  [ "$(readlink "$BROWSER_PACKAGE_ROOT/node_modules/patchright")" = "$package_dir" ]
}

@test "missing package fails without creating a module link" {
  mkdir -p "$MOCK_INSTALL_ROOT"

  run ensure_patchright_node_module

  [ "$status" -ne 0 ]
  [[ "$output" == *"Patchright package not found under $MOCK_INSTALL_ROOT"* ]]
  [ ! -e "$BROWSER_PACKAGE_ROOT/node_modules" ]
}

@test "mise lookup failure propagates without creating a module link" {
  export MOCK_MISE_FAILURE=42

  run ensure_patchright_node_module

  [ "$status" -eq 42 ]
  [ ! -e "$BROWSER_PACKAGE_ROOT/node_modules" ]
}

@test "ensure_patchright_node_module creates package-local symlink" {
  local package_root="$BATS_TEST_TMPDIR/package"
  local patchright_dir="$BATS_TEST_TMPDIR/npm-patchright/lib/node_modules/patchright"
  mkdir -p "$package_root" "$patchright_dir"

  export BROWSER_PACKAGE_ROOT="$package_root"
  export BROWSER_PATCHRIGHT_PACKAGE_DIR="$patchright_dir"
  source "$REPO_DIR/lib/patchright.sh"

  ensure_patchright_node_module

  [ -L "$package_root/node_modules/patchright" ]
  [ "$(readlink "$package_root/node_modules/patchright")" = "$patchright_dir" ]
}

@test "ensure_patchright_node_module refuses existing non-symlink" {
  local package_root="$BATS_TEST_TMPDIR/package"
  local patchright_dir="$BATS_TEST_TMPDIR/npm-patchright/lib/node_modules/patchright"
  mkdir -p "$package_root/node_modules/patchright" "$patchright_dir"

  export BROWSER_PACKAGE_ROOT="$package_root"
  export BROWSER_PATCHRIGHT_PACKAGE_DIR="$patchright_dir"
  source "$REPO_DIR/lib/patchright.sh"

  run ensure_patchright_node_module

  [ "$status" -ne 0 ]
  [[ "$output" == *"exists but is not a symlink"* ]]
}

@test "runtime CLI entry points share engine initialization" {
  for task in launch run close close-all list goto content fill click screenshot scroll wait; do
    assert_file_contains 'source.*runtime.sh' "$REPO_DIR/.mise/tasks/$task" \
      "$task does not initialize the browser runtime"
  done
}

@test "package-local node_modules is ignored" {
  grep -qx 'node_modules/' "$REPO_DIR/.gitignore"
}
