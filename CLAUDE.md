# browser

Browser automation toolkit. Launch, control, and script Chromium instances with saved auth state.

## Structure

```
browser/
├── .mise/tasks/     # Shell tasks (the CLI interface)
├── scripts/         # Node.js scripts (harness, CDP bridge, login flows)
│   └── login/       # Per-site automated login scripts
├── lib/             # Shared shell libraries
│   └── identity.sh  # Agent identity detection and path resolution
└── test/            # BATS tests
```

## Key concepts

- **Agent identity**: Resolved from `GIT_AUTHOR_EMAIL` or `git config user.email`. Used to namespace auth state, PID files, and screenshots.
- **Auth state**: Stored at `~/.config/browser/<agent>/<site>.json`. Falls back to `~/.config/shimmer/browser/<agent>/` for migration.
- **PID files**: `/tmp/browser-id-<id>.json` (canonical) and `/tmp/browser-<agent>.json` (agent-default, points to latest).
- **Browser IDs**: Short random IDs like `b-a1f3`, returned by `launch`, used by other commands via `--browser`.

## Dependencies

- `patchright` (Playwright fork) for browser automation
- `jq` for JSON manipulation in shell tasks
- `1password-cli` for credential resolution in `login`
- All managed via mise

## Testing

```bash
mise run test
```

Tests use BATS. Test helpers are in `test/helpers.bash`.
