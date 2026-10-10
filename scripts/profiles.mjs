import { createProfile, listProfiles } from './profile-store.mjs';
import { cloneProfile } from './clone-profile.mjs';

async function cloneWithCancellation(source, destination) {
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    await cloneProfile(source, destination, { signal: controller.signal });
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}

const [operation, ...args] = process.argv.slice(2);
try {
  if (operation === 'create' && args.length === 1) {
    await createProfile(args[0]);
    console.log(args[0]);
  } else if (operation === 'list' && args.length === 0) {
    for (const name of await listProfiles()) console.log(name);
  } else if (operation === 'clone' && args.length === 2) {
    await cloneWithCancellation(args[0], args[1]);
    console.log(args[1]);
  } else {
    throw new Error('Usage: profiles.mjs create NAME | list | clone SOURCE DESTINATION');
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
