// _harness.mjs — Patchright harness for browser tasks
//
// Modes:
//   login: Save storageState after authenticating (auto or interactive)
//   run:   Load storageState, run a script module, close browser
//          With --browser: attach to persistent browser via CDP instead

import { chromium } from 'patchright';
import { parseArgs } from 'node:util';
import { existsSync, readFileSync, chmodSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolvePidFileById } from './_paths.mjs';

const { values, positionals } = parseArgs({
  options: {
    mode:        { type: 'string' },
    site:        { type: 'string' },
    'auth-file': { type: 'string' },
    script:      { type: 'string' },
    headed:      { type: 'string', default: 'false' },
    username:    { type: 'string' },
    password:    { type: 'string' },
    browser:     { type: 'string' },
  },
  allowPositionals: true,
  strict: false,
});

const mode = values.mode;
const site = values.site;
const authFile = values['auth-file'];
const scriptPath = values.script;
const headed = values.headed === 'true';
const username = values.username;
const password = values.password;
const browserId = values.browser;

// --- Login mode ---

async function runLogin() {
  const automated = username && password;

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const loginScriptPath = join(scriptDir, 'login', `${site}.mjs`);
  const hasLoginScript = existsSync(loginScriptPath);

  const canAutomate = automated && hasLoginScript;
  const browser = await chromium.launch({ headless: canAutomate });
  const context = await browser.newContext();
  const page = await context.newPage();

  let saved = false;
  const saveAuth = async () => {
    saved = true;
    try {
      await context.storageState({ path: authFile });
      chmodSync(authFile, 0o600);
    } catch {
      // Context may be closing
    }
  };

  page.on('framenavigated', async (frame) => {
    if (frame !== page.mainFrame()) return;
    if (frame.url() === 'about:blank') return;
    await saveAuth();
    if (!canAutomate) console.log('Auth captured.');
  });

  if (canAutomate) {
    const loginModule = await import(pathToFileURL(loginScriptPath).href);
    await loginModule.default({ page, username, password });
    await saveAuth();
    await browser.close();

    if (!saved) {
      console.error('Login may have failed — no auth state captured.');
      process.exit(1);
    }
    console.log('Login successful.');
  } else {
    if (automated && !hasLoginScript) {
      console.log(`No automated login script for ${site} — opening interactive login.`);
    }
    await page.goto(`https://${site}`);
    await new Promise(resolve => page.on('close', resolve));
    await browser.close();
  }
}

// --- Run mode: persistent browser (CDP) ---

async function runWithPersistentBrowser() {
  const pidFile = resolvePidFileById(browserId);
  if (!pidFile) {
    console.error(`No browser found with ID ${browserId}. Run: browser launch`);
    process.exit(1);
  }

  const hasAuth = authFile && existsSync(authFile);
  const info = JSON.parse(readFileSync(pidFile, 'utf-8'));
  const browser = await chromium.connectOverCDP(`http://localhost:${info.port}`);

  const contexts = browser.contexts();
  let context = contexts[0];
  let page;

  if (context) {
    const pages = context.pages();
    page = pages[0] || await context.newPage();
  } else {
    context = hasAuth
      ? await browser.newContext({ storageState: authFile })
      : await browser.newContext();
    page = await context.newPage();
  }

  const scriptModule = await import(pathToFileURL(scriptPath).href);

  try {
    await scriptModule.default({ page, context, browser, args: positionals });
  } catch (err) {
    console.error(`Script failed: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  if (hasAuth) {
    await context.storageState({ path: authFile });
    chmodSync(authFile, 0o600);
  }
  await browser.close();
}

// --- Run mode: ephemeral browser ---

async function runEphemeral() {
  const hasAuth = authFile && existsSync(authFile);
  const browser = await chromium.launch({ headless: !headed });
  const context = hasAuth
    ? await browser.newContext({ storageState: authFile })
    : await browser.newContext();
  const page = await context.newPage();

  const scriptModule = await import(pathToFileURL(scriptPath).href);

  try {
    await scriptModule.default({ page, context, browser, args: positionals });
  } catch (err) {
    console.error(`Script failed: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  if (hasAuth) {
    await context.storageState({ path: authFile });
    chmodSync(authFile, 0o600);
  }
  await browser.close();
}

// --- Dispatch ---

if (mode === 'login') {
  await runLogin();
} else if (mode === 'run') {
  if (browserId) {
    await runWithPersistentBrowser();
  } else {
    await runEphemeral();
  }
} else {
  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}
