// CLI orchestration for managed Chromium instances.
import { chromium } from 'patchright';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { profileDataDirectory } from './profile-store.mjs';
import {
  readInstance,
  listInstances,
  removeInstance,
  processIsAlive,
  InstanceNotFoundError,
} from './instances.mjs';

const { values, positionals } = parseArgs({
  options: {
    profile: { type: 'string' },
    temporary: { type: 'boolean', default: false },
    headed: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

async function launch() {
  if (Boolean(values.profile) === values.temporary) {
    throw new Error('Choose exactly one of --profile NAME or --temporary.');
  }
  if (values.profile) {
    await profileDataDirectory(values.profile);
    const existing = (await listInstances()).find(record =>
      record.profile === values.profile && processIsAlive(record.pid));
    if (existing) {
      throw new Error(`Profile "${values.profile}" is already in use by ${existing.id}. Use --browser ${existing.id}.`);
    }
  }

  const id = `b-${randomUUID()}`;
  const options = { id, profile: values.profile, headed: values.headed };
  const workerScript = fileURLToPath(new URL('./browser-worker.mjs', import.meta.url));
  const worker = fork(workerScript, [JSON.stringify(options)], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });

  try {
    const record = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Browser launch timed out.')), 35000);
      function settle(error, result) {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(result);
      }
      worker.once('error', error => settle(error));
      worker.once('exit', () => settle(new Error('Browser worker exited before launch completed.')));
      worker.once('message', message => {
        if (message.error) settle(new Error(message.error));
        else if (message.ready) settle(null, message.ready);
        else settle(new Error('Unexpected browser worker response.'));
      });
    });
    worker.disconnect();
    worker.unref();
    console.log(record.id);
  } catch (error) {
    worker.kill('SIGTERM');
    if (worker.connected) worker.disconnect();
    throw error;
  }
}

async function close(id) {
  const record = await readInstance(id);
  let browser;
  try {
    browser = await chromium.connectOverCDP(record.endpoint, { timeout: 3000 });
  } catch (error) {
    if (processIsAlive(record.pid)) throw error;
    await removeInstance(id);
    console.log(`${id} is already stopped.`);
    return;
  }
  try {
    const session = await browser.newBrowserCDPSession();
    await session.send('Browser.close');
  } finally {
    await browser.close();
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await readInstance(id);
    } catch (error) {
      if (error instanceof InstanceNotFoundError) {
        console.log(`${id} closed.`);
        return;
      }
      throw error;
    }
    await delay(50);
  }
  throw new Error(`Browser ${id} has not finished closing; its record was preserved.`);
}

async function list() {
  const records = await listInstances();
  for (const record of records) {
    const status = processIsAlive(record.pid) ? 'running' : 'stopped';
    console.log(`${record.id}  profile=${record.profile || '(temporary)'}  ${status}`);
  }
  if (!records.length) console.log('No browser instances running.');
}

try {
  const [operation, id] = positionals;
  if (operation === 'launch' && positionals.length === 1) await launch();
  else if (operation === 'list' && positionals.length === 1) await list();
  else if (operation === 'close' && positionals.length === 2) await close(id);
  else if (operation === 'close-all' && values.all && positionals.length === 1) {
    let failed = false;
    for (const record of await listInstances()) {
      try {
        await close(record.id);
      } catch (error) {
        console.error(error.message);
        failed = true;
      }
    }
    if (failed) process.exitCode = 1;
  } else throw new Error('Expected launch, list, close ID, or close-all --all.');
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
