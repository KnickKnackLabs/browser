// Run a Playwright module in a temporary browser or an existing CDP instance.
import { chromium } from 'patchright';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { readInstance } from './instances.mjs';

const { values, positionals } = parseArgs({
  options: {
    script: { type: 'string' },
    headed: { type: 'string', default: 'false' },
    browser: { type: 'string' },
  },
  allowPositionals: true,
});

async function openBrowser() {
  if (!values.browser) {
    return chromium.launch({ headless: values.headed !== 'true' });
  }

  const record = await readInstance(values.browser);
  return chromium.connectOverCDP(record.endpoint, { timeout: 3000 });
}

async function runScript() {
  if (!values.script) throw new Error('A script path is required.');

  const browser = await openBrowser();
  try {
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();
    const scriptModule = await import(pathToFileURL(values.script).href);

    await scriptModule.default({ page, context, browser, args: positionals });
  } finally {
    // For CDP connections, close disconnects the client; the browser stays running.
    await browser.close();
  }
}

try {
  await runScript();
} catch (error) {
  console.error(`Script failed: ${error.message}`);
  process.exitCode = 1;
}
