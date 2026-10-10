// Registry for this user's managed browsers, never inferred from Git or login state.
import { mkdir, readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

export const runtimeDirectory = resolve(process.env.BROWSER_RUNTIME_DIR
  || join(homedir(), '.local', 'state', 'browser', 'instances'));

export function instanceFile(id) {
  if (typeof id !== 'string' || !/^b-[a-zA-Z0-9-]+$/.test(id)) {
    throw new Error('Invalid browser ID.');
  }
  return join(runtimeDirectory, `${id}.json`);
}

export class InstanceNotFoundError extends Error {
  constructor(id) {
    super(`No browser found with ID ${id}.`);
    this.name = 'InstanceNotFoundError';
  }
}

export async function readInstance(id) {
  let source;
  try {
    source = await readFile(instanceFile(id), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new InstanceNotFoundError(id);
    throw error;
  }
  const record = JSON.parse(source);
  const endpoint = new URL(record.endpoint);
  const validIdentity = record.version === 1
    && record.id === id
    && Number.isInteger(record.pid) && record.pid > 0
    && (record.profile === null || typeof record.profile === 'string');
  const validEndpoint = endpoint.protocol === 'ws:'
    && endpoint.hostname === '127.0.0.1' && endpoint.port !== ''
    && endpoint.username === '' && endpoint.password === ''
    && endpoint.search === '' && endpoint.hash === ''
    && /^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(endpoint.pathname);

  if (!validIdentity || !validEndpoint) {
    throw new Error(`Invalid browser record for ${id}.`);
  }
  return record;
}

export async function writeInstance(record) {
  await mkdir(runtimeDirectory, { recursive: true, mode: 0o700 });
  const destination = instanceFile(record.id);
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(record), { mode: 0o600, flag: 'wx' });
  await rename(temporary, destination);
}

export async function removeInstance(id) {
  try {
    await unlink(instanceFile(id));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export async function listInstances() {
  let files;
  try {
    files = await readdir(runtimeDirectory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const records = [];
  for (const file of files.sort()) {
    if (!/^b-[a-zA-Z0-9-]+\.json$/.test(file)) continue;
    records.push(await readInstance(file.slice(0, -5)));
  }
  return records;
}

export function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}
