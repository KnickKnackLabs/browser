import { createProfile, listProfiles } from './profile-store.mjs';

const [operation, ...args] = process.argv.slice(2);
try {
  if (operation === 'create' && args.length === 1) {
    await createProfile(args[0]);
    console.log(args[0]);
  } else if (operation === 'list' && args.length === 0) {
    for (const name of await listProfiles()) console.log(name);
  } else {
    throw new Error('Usage: profiles.mjs create NAME | list');
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
