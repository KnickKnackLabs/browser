// Named Chromium data directories; independent of browser processes and login snapshots.
import { mkdir, readdir, lstat, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const profilesRoot = process.env.BROWSER_PROFILES_DIR
  || join(homedir(), '.local', 'share', 'browser', 'profiles');

function validName(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name);
}

async function createProfile(name) {
  if (!validName(name)) {
    throw new Error('Profile names must start with a letter or digit and contain only letters, digits, underscores, or hyphens.');
  }

  await mkdir(profilesRoot, { recursive: true, mode: 0o700 });
  const profileDirectory = join(profilesRoot, name);

  try {
    // Exclusive creation prevents duplicates, including existing symlinks.
    await mkdir(profileDirectory, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Profile "${name}" already exists.`);
    }
    throw error;
  }

  try {
    await mkdir(join(profileDirectory, 'data'), { mode: 0o700 });
  } catch (error) {
    await rmdir(profileDirectory);
    throw error;
  }

  console.log(name);
}

async function listProfiles() {
  let entries;
  try {
    entries = await readdir(profilesRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
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

  for (const name of names.sort()) console.log(name);
}

const [operation, ...args] = process.argv.slice(2);
try {
  if (operation === 'create' && args.length === 1) {
    await createProfile(args[0]);
  } else if (operation === 'list' && args.length === 0) {
    await listProfiles();
  } else {
    throw new Error('Usage: profiles.mjs create NAME | list');
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
