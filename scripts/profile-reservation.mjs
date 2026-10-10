// Exclusive ownership shared by browser workers and closed-profile clones.
import { open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { profileDirectory } from './profile-store.mjs';

export async function reserveProfile(name, owner) {
  const path = join(profileDirectory(name), 'running.json');
  let file;
  try {
    file = await open(path, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error(`Profile "${name}" is reserved by another operation. Inspect ${path} if a previous operation crashed.`);
  }

  try {
    try {
      await file.writeFile(JSON.stringify(owner));
    } finally {
      await file.close();
    }
  } catch (error) {
    await unlink(path);
    throw error;
  }

  let releasePromise;
  return function releaseProfile() {
    releasePromise ||= unlink(path);
    return releasePromise;
  };
}
