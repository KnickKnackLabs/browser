<div align="center">

# browser

**Chromium automation with named profile storage.**

![tasks: 17](https://img.shields.io/badge/tasks-17-blue?style=flat)
[![tests: 58](https://img.shields.io/badge/tests-58-brightgreen?style=flat)](test/)
![CI: ubuntu-latest + macos-latest](https://img.shields.io/badge/CI-ubuntu--latest%20%2B%20macos--latest-4EAA25?style=flat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE)

</div>

<br />

## Take a quick look

Launch an agent-scoped browser, render a page, and save the current viewport as a PNG.

```bash
browser launch
browser goto https://example.com
browser screenshot
browser close
```

The screenshot command prints a path under `/tmp/browser-screenshots`. Pass that path to an image-aware tool to inspect the rendered page.

## Move around the page

Scroll the persistent browser by signed pixel deltas, then take another viewport screenshot. Ask for the entire scrollable page only when you need it.

```bash
browser scroll --y 700
browser scroll --x 400 --y -200
browser screenshot
browser screenshot --full-page
```

## Interact and inspect

```bash
browser content 'main' --depth 2
browser wait '#results'
browser click 'button[type=submit]'
browser fill 'input[name=q]' 'browser automation'
```

Commands default to the agent's latest browser. Use `--browser b-a1f3` when several instances are running.

## Named profiles

```bash
browser profile create rentals
browser profile list
```

A profile starts as an empty, private Chromium data directory. Creating and listing profiles requires no agent identity and does not launch a browser or copy saved logins.

Profiles live under `~/.local/share/browser/profiles/NAME/data`. Set `BROWSER_PROFILES_DIR` to choose a different profile-storage root. Profile names start with a letter or digit and contain only letters, digits, underscores, and hyphens.

Profile storage is available now; launching by profile and forking profiles are not implemented yet. Existing browser commands still require agent identity until the lifecycle migration is complete.

## Scripted workflows

Export a Playwright module whose default function receives `{ page, context, browser, args }`. Run it in a fresh temporary browser, or attach to a running instance to use that browser's current session.

```bash
browser run /path/to/research.mjs
browser run --browser b-a1f3 /path/to/research.mjs
```

Attached runs leave the browser running. Temporary runs close their browser afterward. Scripts are imported once, and no site metadata or saved-auth files are consulted. See `scripts/github-avatar-upload.mjs` for an example; it requires an already logged-in browser.

Saved-auth commands (`login`, `save-auth`, `load-auth`, and auth `status`) and `run --site` have been removed. Old snapshot files remain untouched on disk but are no longer loaded or updated. Log in manually in a headed browser; profile-based persistence is the next lifecycle change.

## Development

```bash
mise trust
mise install
mise run test
mise run doctor

# Optional clone-local safety net
codebase pre-commit
```

- Public commands live in `.mise/tasks`.
- Browser actions live in `scripts/_cdp.mjs`.
- The public test task uses the KKL BATS fork and Rush to run isolated tests concurrently across and within files.
- CI checks Ubuntu, macOS, convention lints, and this generated README.

<details>
<summary><b>Current repository health</b></summary>

This checkout exposes 17 public tasks and 58 BATS tests, with this configured convention lint portfolio.

```
@all
```

</details>

<div align="center">

<sub>
Generated from `README.tsx` with [KnickKnackLabs/readme](https://github.com/KnickKnackLabs/readme).
</sub></div>
