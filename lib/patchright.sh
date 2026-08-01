#!/usr/bin/env bash
# Helpers for making mise-managed npm:patchright resolvable to Node ESM.

resolve_patchright_package_dir() {
  if [ -n "${BROWSER_PATCHRIGHT_PACKAGE_DIR:-}" ]; then
    printf '%s\n' "$BROWSER_PATCHRIGHT_PACKAGE_DIR"
    return 0
  fi

  local install_root
  install_root="$(mise where npm:patchright)"
  printf '%s/lib/node_modules/patchright\n' "$install_root"
}

ensure_patchright_node_module() {
  local lib_dir
  lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local package_root="${BROWSER_PACKAGE_ROOT:-$(cd "$lib_dir/.." && pwd)}"
  local patchright_dir
  patchright_dir="$(resolve_patchright_package_dir)"

  if [ ! -d "$patchright_dir" ]; then
    echo "Patchright package not found at $patchright_dir. Run: mise install" >&2
    return 1
  fi

  mkdir -p "$package_root/node_modules"

  local link_path="$package_root/node_modules/patchright"
  if [ -L "$link_path" ]; then
    if [ "$(readlink "$link_path")" = "$patchright_dir" ]; then
      return 0
    fi
    rm -f "$link_path"
  elif [ -e "$link_path" ]; then
    echo "$link_path exists but is not a symlink; refusing to replace it" >&2
    return 1
  fi

  ln -s "$patchright_dir" "$link_path"
}
