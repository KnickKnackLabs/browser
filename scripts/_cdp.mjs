// _cdp.mjs — CDP connector + action dispatch for browser primitives
//
// Usage: node _cdp.mjs --action <name> [--agent <agent> | --browser <id>] [action-specific args]
//
// Connects to a running Chromium via CDP, performs one action, disconnects.
// The browser keeps running after disconnect.

import { chromium } from 'patchright';
import { parseArgs } from 'node:util';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { chmodSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePidFileById, resolvePidFileByAgent, resolveAuthFile, newAuthFile } from './_paths.mjs';
import { SERIALIZE_FN } from './_serialize.mjs';

const { values, positionals } = parseArgs({
  options: {
    action:   { type: 'string' },
    agent:    { type: 'string' },
    browser:  { type: 'string' },
    selector: { type: 'string' },
    depth:    { type: 'string', default: '1' },
    value:    { type: 'string' },
    stdout:   { type: 'boolean', default: false },
    'full-page': { type: 'boolean', default: false },
    x:        { type: 'string', default: '0' },
    y:        { type: 'string', default: '0' },
    timeout:  { type: 'string', default: '30000' },
    site:     { type: 'string' },
  },
  allowPositionals: true,
  strict: false,
});

const action = values.action;
const browserId = values.browser;
let agent = values.agent;

if (!action) {
  console.error('Usage: node _cdp.mjs --action <name> [--agent <agent> | --browser <id>] [args]');
  process.exit(1);
}

// --- CDP connection ---

async function connect() {
  let pidFile;
  if (browserId) {
    pidFile = resolvePidFileById(browserId);
    if (!pidFile) {
      console.error(`No browser found with ID ${browserId}. Run: browser launch`);
      process.exit(1);
    }
  } else if (agent) {
    pidFile = resolvePidFileByAgent(agent);
    if (!pidFile) {
      console.error(`No browser running for ${agent}. Run: browser launch`);
      process.exit(1);
    }
  } else {
    console.error('Either --agent or --browser is required');
    process.exit(1);
  }

  const info = JSON.parse(readFileSync(pidFile, 'utf-8'));
  if (!agent) agent = info.agent;

  const browser = await chromium.connectOverCDP(`http://localhost:${info.port}`);
  const contexts = browser.contexts();
  let context = contexts[0] || await browser.newContext();
  const pages = context.pages();
  let page = pages[0] || await context.newPage();

  return { browser, context, page };
}

// --- Action handlers ---

const actions = {
  async goto() {
    const url = positionals[0];
    if (!url) { console.error('Usage: --action goto <url>'); process.exit(1); }
    const { browser, page } = await connect();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log(page.url());
    await browser.close();
  },

  async content() {
    const selector = values.selector || positionals[0] || 'body';
    const depth = parseInt(values.depth, 10);
    const { browser, page } = await connect();
    const html = await page.evaluate(SERIALIZE_FN, { selector, depth });
    process.stdout.write(html);
    await browser.close();
  },

  async fill() {
    const selector = values.selector || positionals[0];
    const fillValue = values.value || positionals[1];
    if (!selector || fillValue === undefined) {
      console.error('Usage: --action fill --selector <sel> --value <val>');
      process.exit(1);
    }
    const { browser, page } = await connect();
    await page.fill(selector, fillValue);
    await browser.close();
  },

  async click() {
    const selector = values.selector || positionals[0];
    if (!selector) { console.error('Usage: --action click --selector <sel>'); process.exit(1); }
    const { browser, page } = await connect();
    await page.click(selector);
    await browser.close();
  },

  async screenshot() {
    const { browser, page } = await connect();
    const options = { type: 'png', fullPage: values['full-page'] };
    if (values.stdout) {
      const buf = await page.screenshot(options);
      process.stdout.write(buf);
    } else {
      const dir = '/tmp/browser-screenshots';
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `${agent}-${Date.now()}.png`);
      await page.screenshot({ ...options, path });
      console.log(path);
    }
    await browser.close();
  },

  async scroll() {
    const x = Number(values.x);
    const y = Number(values.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
      console.error('Usage: --action scroll [--x <pixels>] [--y <pixels>] (at least one nonzero finite delta)');
      process.exit(1);
    }
    const { browser, page } = await connect();
    await page.mouse.wheel(x, y);
    await browser.close();
  },

  async 'save-auth'() {
    const site = values.site || positionals[0];
    if (!site) { console.error('Usage: --action save-auth --site <site>'); process.exit(1); }
    const { browser, context } = await connect();
    const authPath = newAuthFile(agent, site);
    await context.storageState({ path: authPath });
    chmodSync(authPath, 0o600);
    console.log(`Auth saved: ${authPath}`);
    await browser.close();
  },

  async 'load-auth'() {
    const site = values.site || positionals[0];
    if (!site) { console.error('Usage: --action load-auth --site <site>'); process.exit(1); }
    const authPath = resolveAuthFile(agent, site);
    if (!existsSync(authPath)) {
      console.error(`No auth found for ${agent} @ ${site}`);
      console.error(`Run: browser login ${site}`);
      process.exit(1);
    }
    const { browser, context } = await connect();
    const state = JSON.parse(readFileSync(authPath, 'utf-8'));
    if (state.cookies && state.cookies.length > 0) {
      await context.addCookies(state.cookies);
    }
    console.log(`Auth loaded from: ${authPath}`);
    await browser.close();
  },

  async wait() {
    const selector = values.selector || positionals[0];
    if (!selector) { console.error('Usage: --action wait --selector <sel> [--timeout <ms>]'); process.exit(1); }
    const timeout = parseInt(values.timeout, 10);
    const { browser, page } = await connect();
    await page.waitForSelector(selector, { timeout });
    await browser.close();
  },
};

// --- Dispatch ---

if (!actions[action]) {
  console.error(`Unknown action: ${action}`);
  process.exit(1);
}
await actions[action]();
