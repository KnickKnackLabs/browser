<div align="center">

# browser

**Chromium automation with named profile storage.**

![tasks: 17](https://img.shields.io/badge/tasks-17-blue?style=flat)
[![tests: 42](https://img.shields.io/badge/tests-42-brightgreen?style=flat)](test/)
![CI: ubuntu-latest + macos-latest](https://img.shields.io/badge/CI-ubuntu--latest%20%2B%20macos--latest-4EAA25?style=flat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE)

</div>

<br />

## Take a quick look

Create a named profile, launch Chromium, and save the current viewport as a PNG.

```bash
browser profile create rentals
id=$(browser launch --profile rentals --headed)
browser goto --browser "$id" https://example.com
browser screenshot --browser "$id"
browser close "$id"
```

The screenshot command prints a private PNG path under the instance registry's `screenshots` directory. Pass that path to an image-aware tool to inspect the rendered page.

## Move around the page

Scroll the persistent browser by signed pixel deltas, then take another viewport screenshot. Ask for the entire scrollable page only when you need it.

```bash
browser scroll --browser b-a1f3 --y 700
browser scroll --browser b-a1f3 --x 400 --y -200
browser screenshot --browser b-a1f3
browser screenshot --browser b-a1f3 --full-page
```

## Interact and inspect

```bash
browser content --browser b-a1f3 'main' --depth 2
browser wait --browser b-a1f3 '#results'
browser click --browser b-a1f3 'button[type=submit]'
browser fill --browser b-a1f3 'input[name=q]' 'browser automation'
```

Controls require an explicit browser ID. Use `browser list` to find managed instances. `browser close-all --all` explicitly closes every instance in this user's registry.

## Named profiles

```bash
browser profile create rentals
browser profile list
```

A profile starts as an empty, private Chromium data directory. Browsing updates it automatically; persistent cookies, storage, and preferences survive clean restarts. Sites can expire logins, and session-only cookies may not survive a restart. No Git identity or account inference is used.

Profiles live under `~/.local/share/browser/profiles/NAME/data`. Set `BROWSER_PROFILES_DIR` to choose a different profile-storage root. Profile names start with a letter or digit and contain only letters, digits, underscores, and hyphens.

Launch with `--profile NAME` or `--temporary`, never an implicit default. A profile can be used by only one managed instance at a time, including concurrent launches. Temporary browser data is removed on clean close. Forking closed profiles is not implemented yet.

## Scripted workflows

Export a Playwright module whose default function receives `{ page, context, browser, args }`. Run it in a fresh temporary browser, or attach to a running instance to use that browser's current session.

```bash
browser run /path/to/research.mjs
browser run --browser b-a1f3 /path/to/research.mjs
```

Attached runs leave the browser running. Temporary runs close their browser afterward. Scripts are imported once, and no site metadata or saved-auth files are consulted. See `scripts/workflows/github-avatar-upload.mjs` for an example; it requires an already logged-in browser.

Saved-auth commands (`login`, `save-auth`, `load-auth`, and auth `status`) and `run --site` have been removed. Old snapshot files remain untouched on disk but are no longer loaded or updated. Log in manually in a headed named profile; its state persists on close.

## Lifecycle and recovery

Instance records live under `~/.local/state/browser/instances`, or `BROWSER_RUNTIME_DIR`. A detached worker owns each Chromium context. Closing uses CDP for a graceful shutdown, not a blind PID signal. Old process records and saved logins are not adopted.

Each active named profile has a private `running.json` reservation. Clean close releases it after Chromium exits. An abruptly killed worker may leave a reservation; launches then refuse rather than risk concurrent writes. Automatic crash recovery is not implemented. Verify that no Chromium process uses that data directory before manually removing a stale reservation. Profiles and instance records are private session data, not Git artifacts.

## Development

```bash
mise trust
mise install
mise run setup
mise run test
mise run doctor

# Optional clone-local safety net
codebase pre-commit
```

- Public commands live in `.mise/tasks`.
- Browser actions live in `scripts/_cdp.mjs`.
- The public test task uses the KKL BATS fork and Rush to run isolated tests concurrently across and within files.
- Real Chromium lifecycle tests cover persistent cookies, temporary isolation, and simultaneous profile launches. Install Chromium with `mise run setup`; CI installs it on Ubuntu and macOS.
- CI also checks convention lints and this generated README.

<details>
<summary><b>Current repository health</b></summary>

This checkout exposes 17 public tasks and 42 BATS tests, with this configured convention lint portfolio.

```
@all
```

</details>

<div align="center">

<sub>
Generated from `README.tsx` with [KnickKnackLabs/readme](https://github.com/KnickKnackLabs/readme).
</sub></div>
