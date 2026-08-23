# Contributing to browser

`browser` is a browser automation toolkit. It launches, controls, and scripts Chromium instances with saved auth state.

## Structure

```
browser/
├── .mise/tasks/     # Public CLI tasks, BATS workflow, and observational doctor
├── scripts/         # Node.js scripts (harness, CDP bridge, login flows)
│   └── login/       # Per-site automated login scripts
├── lib/             # Shared self-locating shell libraries
├── test/            # BATS tests
└── README.tsx       # Programmable source for generated README.md
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
mise run doctor
codebase lint "$PWD"
readme build --check
```

Tests use the KKL-maintained BATS fork and Rush with a four-job default across and within files. Test helpers are in `test/helpers.bash` and derive the repository from `$BATS_TEST_DIRNAME`. Tests must isolate mutable state per test; use `mise run test --jobs 1` for serial debugging.

`mise run doctor` is observational. It reports generated README, configured lint, and optional local hook state without repairing the checkout. Edit `README.tsx`, then run `readme build`; do not hand-edit `README.md`.

## Release notes

Use signed tags for releases. Keep runtime package dependencies resolvable from a fresh shiv/mise install, and do not commit generated `node_modules/` directories.
