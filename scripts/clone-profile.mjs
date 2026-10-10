// Copy a closed profile while reserving both names; publish complete data atomically.
import { cp, lstat, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { profileDirectory, profileDataDirectory, createProfileDirectory } from './profile-store.mjs';
import { reserveProfile } from './profile-reservation.mjs';

async function requireClosedChromium(dataDirectory) {
  for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    try {
      await lstat(join(dataDirectory, name));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    throw new Error(`Chromium lock ${name} remains in the source profile. Close Chromium and verify the profile is unused before cloning.`);
  }
}

export async function cloneProfile(source, destination, { copyDirectory = cp, signal } = {}) {
  profileDirectory(source);
  profileDirectory(destination);
  if (source === destination) throw new Error('Source and destination profiles must differ.');

  const sourceData = await profileDataDirectory(source);
  const owner = { operation: 'clone', source, destination, pid: process.pid };
  const releaseSource = await reserveProfile(source, owner);
  let destinationDirectory;
  let releaseDestination;
  let published = false;

  try {
    signal?.throwIfAborted();
    await requireClosedChromium(sourceData);
    destinationDirectory = await createProfileDirectory(destination);
    releaseDestination = await reserveProfile(destination, owner);
    const stagingData = join(destinationDirectory, 'copying-data');

    await copyDirectory(sourceData, stagingData, {
      recursive: true,
      force: false,
      errorOnExist: true,
      preserveTimestamps: true,
      async filter(path) {
        signal?.throwIfAborted();
        const entry = await lstat(path);
        if (!entry.isDirectory() && !entry.isFile()) {
          throw new Error(`Cannot clone profile containing a symlink or special file: ${path}`);
        }
        return true;
      },
    });

    signal?.throwIfAborted();
    await rename(stagingData, join(destinationDirectory, 'data'));
    published = true;
  } finally {
    try {
      if (published) {
        await releaseDestination();
      } else if (destinationDirectory) {
        // Keep the reservation in place until failed destination data is gone.
        await rm(destinationDirectory, { recursive: true, force: true });
      }
    } finally {
      await releaseSource();
    }
  }
}
