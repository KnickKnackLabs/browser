# Contributing to browser

`browser` manages named Chromium profiles and running browser instances. It knows nothing about callers' identities: humans, agents, and scripts use the same interface.

## Structure

- `.mise/tasks/`: thin public CLI entry points.
- `lib/runtime.sh`: Chromium cache and package initialization.
- `scripts/profile-store.mjs`: profile names, paths, creation, and discovery.
- `scripts/profile-reservation.mjs`: exclusive profile ownership shared by browser workers and forks.
- `scripts/fork-profile.mjs`: closed-source validation, copying, atomic data publication, and rollback.
- `scripts/instances.mjs`: private, versioned instance records and endpoint validation.
- `scripts/browsers.mjs`: launch/list/close orchestration.
- `scripts/browser-worker.mjs`: owns one persistent Chromium context and its cleanup.
- `scripts/_cdp.mjs`: page actions against a selected instance.
- `scripts/_harness.mjs`: runs a workflow in a temporary or attached context.
- `scripts/workflows/`: built-in user workflows, separate from implementation modules.
- `test/`: BATS public-task tests, focused library tests, and real Chromium integration tests.
- `README.tsx`: source for generated `README.md`.

## State ownership

Profiles live at `~/.local/share/browser/profiles/<name>/data`, configurable with `BROWSER_PROFILES_DIR`. Workers and forks exclusively create `running.json` through the same reservation owner before using a profile. Workers reserve one profile; forks reserve both source and destination. This prevents both conflicting writes and Chromium forwarding a second launch into an existing process. Chromium still applies its own native data-directory protections.

Instance records live at `~/.local/state/browser/instances/<id>.json`, configurable with `BROWSER_RUNTIME_DIR`. IDs select exact instances; there is no latest-browser default. Records store a worker PID, optional profile name, and the browser-specific IPv4 loopback WebSocket endpoint. Close uses that endpoint to request graceful Chromium shutdown; it never signals a potentially reused PID. List is observational, including stopped records.

On clean shutdown the worker releases its reservation, removes its registry record, and deletes temporary data if applicable. Named profile data is retained. An abrupt worker kill can leave a reservation; automatic crash recovery is deliberately not implemented. Do not remove a stale reservation until its owner process has stopped and no Chromium process uses that profile. Unknown or legacy state is not automatically imported or deleted.

Forking requires a closed source and a new destination. The destination's `data` directory appears only after the entire copy completes; launch cannot open partial data. Remaining native Chromium singleton files, symlinks, and special files are refused. Copy failures and cooperative cancellation remove the newly created destination while its reservation is still held, then release the source. A hard process kill can leave an incomplete directory or reservations; it is not automatically recovered. Copies retain private local login data but still use the same remote accounts. Reservations coordinate managed commands; do not point other tools directly at these data directories while forking.

`forkProfile` accepts a narrow copy capability and an AbortSignal for deterministic failure/cancellation tests. CLI signal handling stays in `profiles.mjs`, not the storage/copy owner.

Saved-auth commands, Git identity detection, Shimmer migration, and implicit login loading are removed. Login happens in a headed profile. Attaching a script reuses the selected browser's context; temporary script runs start fresh.

## Validation

```bash
mise trust
mise install
mise run setup
mise run test
mise run doctor
```

Lifecycle tests require real Chromium. They verify that two forks begin with a dummy cookie, diverge locally, and leave the baseline's cookie unchanged. `test/profile-fork.bats` covers filesystem refusals and CLI behavior; its boundary probe tests the internal copy/reservation seam, including rollback and cancellation.

CI installs Chromium (including Linux dependencies) and runs tests on Ubuntu and macOS. Without the browser cache, lifecycle tests explicitly skip; that is not evidence that the lifecycle works. Tests isolate registry and profile roots without overriding HOME or mise's trust state. The public test task supports `mise run test test/lifecycle.bats` and `--jobs 1` for serial debugging.

Dependencies are pinned through mise: Patchright, Node, and the KKL BATS fork with Rush. `lib/patchright.sh` makes the mise-managed package resolvable without committing `node_modules`.

Edit `README.tsx`, then run `readme build`; do not hand-edit `README.md`. Doctor observes generated docs, configured lints, and optional local hook state without repairing the checkout.

## Release notes

Use signed tags for releases. Verify runtime dependencies resolve from a fresh shiv/mise install. Profile and instance directories contain private session state and must never be committed.
