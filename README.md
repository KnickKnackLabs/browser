<div align="center">

# browser

**Agent-scoped Chromium automation with saved authentication.**

![tasks: 19](https://img.shields.io/badge/tasks-19-blue?style=flat)
[![tests: 48](https://img.shields.io/badge/tests-48-brightgreen?style=flat)](test/)
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

## Authenticated workflows

Saved browser state is namespaced by agent and site. Login can use a supported automatic flow or a visible interactive browser.

```bash
browser login github.com
browser launch
browser load-auth github.com
browser goto https://github.com/settings/profile
browser save-auth github.com
```

For a larger workflow, export a Playwright module and run it with `browser run`. See `scripts/github-avatar-upload.mjs` for the script contract.

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
- The public test task runs independent BATS files across Rush workers while keeping each file serial.
- CI checks Ubuntu, macOS, convention lints, and this generated README.

<details>
<summary><b>Current repository health</b></summary>

This checkout exposes 19 public tasks and 48 BATS tests, with this configured convention lint portfolio.

```
@all
```

</details>

<div align="center">

<sub>
Generated from `README.tsx` with [KnickKnackLabs/readme](https://github.com/KnickKnackLabs/readme).
</sub></div>
