#!/usr/bin/env bats

load helpers

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
