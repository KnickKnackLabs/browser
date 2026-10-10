#!/usr/bin/env bash
# Shared Chromium installation path; no identity or session-state discovery.
export PLAYWRIGHT_BROWSERS_PATH="${XDG_CACHE_HOME:-$HOME/.cache}/browser"
runtime_lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$runtime_lib_dir/patchright.sh"
ensure_patchright_node_module
