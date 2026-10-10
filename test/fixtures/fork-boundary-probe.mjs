// Focused filesystem/capability proof; public CLI and real Chromium tests run separately.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createProfile, profileDirectory, profileDataDirectory } from '../../scripts/profile-store.mjs';
import { reserveProfile } from '../../scripts/profile-reservation.mjs';
import { forkProfile } from '../../scripts/fork-profile.mjs';

await createProfile('baseline');
await writeFile(join(await profileDataDirectory('baseline'), 'state'), 'original');

// Repeated cleanup must not release a subsequent owner's reservation.
const releaseFirst = await reserveProfile('baseline', { operation: 'first' });
await releaseFirst();
const releaseSecond = await reserveProfile('baseline', { operation: 'second' });
await releaseFirst();
await assert.rejects(reserveProfile('baseline', { operation: 'competing' }), /reserved/);
await releaseSecond();

for (const mode of ['failure', 'cancellation']) {
  const destination = `research-${mode}`;
  const controller = new AbortController();
  async function copyDirectory(source, staging) {
    await assert.rejects(reserveProfile('baseline', { operation: 'competing' }), /reserved/);
    await assert.rejects(reserveProfile(destination, { operation: 'competing' }), /reserved/);
    await assert.rejects(profileDataDirectory(destination), { code: 'ENOENT' });

    await mkdir(staging, { mode: 0o700 });
    await writeFile(join(staging, 'partial'), 'incomplete');
    if (mode === 'failure') throw new Error('Injected copy failure.');
    controller.abort();
  }

  const expectedError = mode === 'failure' ? /Injected copy failure/ : { name: 'AbortError' };
  await assert.rejects(forkProfile('baseline', destination, {
    copyDirectory,
    signal: controller.signal,
  }), expectedError);

  await assert.rejects(access(profileDirectory(destination)), { code: 'ENOENT' });
  await assert.rejects(access(join(profileDirectory('baseline'), 'running.json')), { code: 'ENOENT' });
  assert.equal(await readFile(join(await profileDataDirectory('baseline'), 'state'), 'utf8'), 'original');

  // A subsequent real copy proves the source lease and destination name are reusable.
  await forkProfile('baseline', destination);
  assert.equal(await readFile(join(await profileDataDirectory(destination), 'state'), 'utf8'), 'original');
}
