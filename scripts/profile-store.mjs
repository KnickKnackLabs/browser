// Named, private Chromium data directories; browser workers reserve them during use.
import { mkdir, readdir, lstat, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

export const profilesRoot = resolve(process.env.BROWSER_PROFILES_DIR
  || join(homedir(), '.local', 'share', 'browser', 'profiles'));

function validName(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name);
}

export function profileDirectory(name) {
  if (!validName(name)) {
    throw new Error('Profile names must start with a letter or digit and contain only letters, digits, underscores, or hyphens.');
  }
  return join(profilesRoot, name);
}

export async function profileDataDirectory(name) {
  const directory = profileDirectory(name);
  const data = join(directory, 'data');
  if (!(await lstat(directory)).isDirectory() || !(await lstat(data)).isDirectory()) {
    throw new Error(`Profile "${name}" is not a regular profile directory.`);
  }
  return data;
}

export async function createProfile(name) {
  const directory = profileDirectory(name);
  await mkdir(profilesRoot, { recursive: true, mode: 0o700 });
  try {
    await mkdir(directory, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Profile "${name}" already exists.`);
    throw error;
  }
  try {
    await mkdir(join(directory, 'data'), { mode: 0o700 });
  } catch (error) {
    await rmdir(directory);
    throw error;
  }
}

export async function listProfiles() {
  let entries;
  try {
    entries = await readdir(profilesRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !validName(entry.name)) continue;
    try {
      const data = await lstat(join(profilesRoot, entry.name, 'data'));
      if (data.isDirectory()) names.push(entry.name);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return names.sort();
}
