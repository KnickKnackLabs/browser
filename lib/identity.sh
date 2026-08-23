#!/usr/bin/env bash
# identity.sh — Agent identity detection and path resolution for browser tasks
#
# Source this file at the top of any browser task:
#   source "$MISE_CONFIG_ROOT/lib/identity.sh"
#
# Provides:
#   AGENT           — agent name (e.g. "k7r2")
#   resolve_agent   — detect agent from git identity
#   auth_dir        — auth state directory for this agent
#   auth_file       — auth state file for a given site
#   browser_runtime_dir — PID-state directory (defaults to /tmp)
#   pid_file_for_id — PID file path for a browser ID
#   pid_file_for_agent — PID file path for an agent's default browser
#   cache_dir       — browser cache directory (Chromium install)
#   screenshot_dir  — screenshot output directory

# Detect agent identity from GIT_AUTHOR_EMAIL or git config
resolve_agent() {
  local name=""
  if [ -n "${GIT_AUTHOR_EMAIL:-}" ]; then
    name="${GIT_AUTHOR_EMAIL%@ricon.family}"
  else
    local email=""
    if email=$(git config user.email 2>/dev/null) && [[ "$email" == *@ricon.family ]]; then
      name="${email%@ricon.family}"
    else
      echo "No agent identity detected. Run: eval \$(shimmer as <agent>)" >&2
      return 1
    fi
  fi

  if [ -z "$name" ]; then
    echo "No agent identity detected. Run: eval \$(shimmer as <agent>)" >&2
    return 1
  fi

  # Validate: agent name must be alphanumeric/hyphens only (no path traversal)
  if [[ ! "$name" =~ ^[a-zA-Z0-9-]+$ ]]; then
    echo "Invalid agent name: $name" >&2
    return 1
  fi

  echo "$name"
}

# Set AGENT global (call once at task start)
AGENT="$(resolve_agent)" || exit 1

# Auth state paths — check new location first, fall back to shimmer path
auth_dir() {
  local agent="${1:-$AGENT}"
  local new_dir="$HOME/.config/browser/$agent"
  local old_dir="$HOME/.config/shimmer/browser/$agent"

  if [ -d "$new_dir" ]; then
    echo "$new_dir"
  elif [ -d "$old_dir" ]; then
    echo "[migration] Using legacy auth dir: $old_dir" >&2
    echo "$old_dir"
  else
    # Default to new location
    echo "$new_dir"
  fi
}

auth_file() {
  local site="$1"
  local agent="${2:-$AGENT}"
  local new_file="$HOME/.config/browser/$agent/${site}.json"
  local old_file="$HOME/.config/shimmer/browser/$agent/${site}.json"

  if [ -f "$new_file" ]; then
    echo "$new_file"
  elif [ -f "$old_file" ]; then
    echo "[migration] Using legacy auth file: $old_file" >&2
    echo "$old_file"
  else
    # Default to new location
    echo "$new_file"
  fi
}

# Ensure auth directory exists at new location
ensure_auth_dir() {
  local agent="${1:-$AGENT}"
  mkdir -p "$HOME/.config/browser/$agent"
  echo "$HOME/.config/browser/$agent"
}

# PID file paths
browser_runtime_dir() {
  printf '%s\n' "${BROWSER_RUNTIME_DIR:-/tmp}"
}

pid_file_for_id() {
  printf '%s/browser-id-%s.json\n' "$(browser_runtime_dir)" "$1"
}

pid_file_for_agent() {
  printf '%s/browser-%s.json\n' "$(browser_runtime_dir)" "${1:-$AGENT}"
}

# Cache and output directories
cache_dir() {
  echo "${XDG_CACHE_HOME:-$HOME/.cache}/browser"
}

screenshot_dir() {
  echo "/tmp/browser-screenshots"
}

# Export PLAYWRIGHT_BROWSERS_PATH for Node scripts
PLAYWRIGHT_BROWSERS_PATH="$(cache_dir)"
export PLAYWRIGHT_BROWSERS_PATH
