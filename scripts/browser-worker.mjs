// Own one persistent Chromium context until it closes; outlive the launching CLI.
import { chromium } from 'patchright';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { profileDataDirectory } from './profile-store.mjs';
import { reserveProfile } from './profile-reservation.mjs';
import { writeInstance, removeInstance } from './instances.mjs';

const options = JSON.parse(process.argv[2]);
let context;
let temporaryDirectory;
let releaseProfile;
let published = false;
let stopping = false;
let closed = false;

async function stop() {
  stopping = true;
  if (context && !closed) await context.close();
}

function requestStop() {
  stop().catch(() => process.exit(1));
}

process.on('SIGTERM', requestStop);
process.on('SIGINT', requestStop);
process.on('disconnect', () => {
  if (!published) requestStop();
});

async function debuggingEndpoint(dataDirectory) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let contents = '';
    try {
      contents = await readFile(join(dataDirectory, 'DevToolsActivePort'), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const [port, path] = contents.trim().split('\n');
    if (/^\d+$/.test(port) && path?.startsWith('/devtools/browser/')) {
      return `ws://127.0.0.1:${port}${path}`;
    }
    if (closed || stopping) throw new Error('Browser closed before becoming ready.');
    await delay(50);
  }
  throw new Error('Chromium did not publish its debugging endpoint.');
}

try {
  let dataDirectory;
  if (options.profile) {
    dataDirectory = await profileDataDirectory(options.profile);
    releaseProfile = await reserveProfile(options.profile, {
      operation: 'browser', id: options.id, pid: process.pid,
    });
  } else {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'browser-session-'));
    dataDirectory = temporaryDirectory;
  }

  // The reservation prevents Chromium forwarding a second launch into the first.
  context = await chromium.launchPersistentContext(dataDirectory, {
    headless: !options.headed,
    args: ['--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1'],
    timeout: 30000,
  });
  const contextClosed = new Promise(resolve => {
    context.once('close', () => {
      closed = true;
      resolve();
    });
  });

  if (stopping) {
    await context.close();
  } else {
    const endpoint = await debuggingEndpoint(dataDirectory);
    const record = {
      version: 1,
      id: options.id,
      pid: process.pid,
      profile: options.profile || null,
      endpoint,
    };
    if (stopping || closed) throw new Error('Browser closed before becoming ready.');
    await writeInstance(record);
    if (stopping || closed) throw new Error('Browser closed before becoming ready.');
    published = true;
    process.send({ ready: record }, error => {
      if (error) requestStop();
    });
  }
  await contextClosed;
} catch (error) {
  if (process.connected) process.send({ error: error.message });
  process.exitCode = 1;
} finally {
  // Never release a profile while its Chromium context could still be writing.
  if (context && !closed) await context.close();
  if (releaseProfile) await releaseProfile();
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  await removeInstance(options.id);
  if (process.connected) process.disconnect();
}
