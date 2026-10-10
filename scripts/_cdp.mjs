// Execute one page action, then disconnect without closing the managed browser.
import { chromium } from 'patchright';
import { parseArgs } from 'node:util';
import { mkdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { readInstance, runtimeDirectory } from './instances.mjs';
import { SERIALIZE_FN } from './_serialize.mjs';

const { values, positionals } = parseArgs({
  options: {
    action: { type: 'string' },
    browser: { type: 'string' },
    selector: { type: 'string' },
    depth: { type: 'string', default: '1' },
    value: { type: 'string' },
    stdout: { type: 'boolean', default: false },
    'full-page': { type: 'boolean', default: false },
    x: { type: 'string', default: '0' },
    y: { type: 'string', default: '0' },
    timeout: { type: 'string', default: '30000' },
  },
  allowPositionals: true,
});

function required(value, name) {
  if (value === undefined || value === '') throw new Error(`${name} is required.`);
  return value;
}

function nonnegativeInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${name} must be a nonnegative integer.`);
  }
  return number;
}

const actions = {
  async goto(page) {
    await page.goto(required(positionals[0], 'URL'), { waitUntil: 'domcontentloaded' });
    console.log(page.url());
  },
  async content(page) {
    const selector = values.selector || positionals[0] || 'body';
    const depth = nonnegativeInteger(values.depth, 'Depth');
    process.stdout.write(await page.evaluate(SERIALIZE_FN, { selector, depth }));
  },
  async fill(page) {
    const selector = required(values.selector ?? positionals[0], 'Selector');
    const value = values.value ?? positionals[1];
    if (value === undefined) throw new Error('Input value is required.');
    await page.fill(selector, value);
  },
  async click(page) {
    await page.click(required(values.selector ?? positionals[0], 'Selector'));
  },
  async screenshot(page) {
    const options = { type: 'png', fullPage: values['full-page'] };
    if (values.stdout) {
      process.stdout.write(await page.screenshot(options));
      return;
    }
    const directory = join(runtimeDirectory, 'screenshots');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, `${values.browser}-${Date.now()}.png`);
    await page.screenshot({ ...options, path });
    await chmod(path, 0o600);
    console.log(path);
  },
  async scroll(page) {
    const x = Number(values.x);
    const y = Number(values.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
      throw new Error('Scroll requires at least one nonzero finite delta.');
    }
    await page.mouse.wheel(x, y);
  },
  async wait(page) {
    const selector = required(values.selector ?? positionals[0], 'Selector');
    const timeout = nonnegativeInteger(values.timeout, 'Timeout');
    await page.waitForSelector(selector, { timeout });
  },
};

async function runAction() {
  const action = actions[values.action];
  if (typeof action !== 'function' || !Object.hasOwn(actions, values.action)) {
    throw new Error(`Unknown action: ${values.action}`);
  }
  const record = await readInstance(values.browser);
  const browser = await chromium.connectOverCDP(record.endpoint, { timeout: 3000 });
  try {
    const context = browser.contexts()[0];
    if (!context) throw new Error('Managed browser has no context.');
    const page = context.pages()[0] || await context.newPage();
    await action(page);
  } finally {
    await browser.close();
  }
}

try {
  await runAction();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
