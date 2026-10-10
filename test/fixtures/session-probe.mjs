import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';

if (process.env.SESSION_IMPORT_LOG) appendFileSync(process.env.SESSION_IMPORT_LOG, 'import\n');

export default async function ({ context, args }) {
  const [operation] = args;
  const cookies = await context.cookies('https://example.test');
  const cookie = cookies.find(value => value.name === 'test-session');

  if (operation === 'fail') throw new Error('Injected workflow failure.');

  if (operation === 'set') {
    await context.addCookies([{
      name: 'test-session', value: 'dummy', url: 'https://example.test',
      expires: Math.floor(Date.now() / 1000) + 3600,
    }]);
  } else if (operation === 'expect-saved') {
    assert.equal(cookie?.value, 'dummy');
  } else if (operation === 'expect-empty') {
    assert.equal(cookie, undefined);
  } else {
    throw new Error(`Unknown probe operation: ${operation}`);
  }
  console.log(`Verified ${operation}.`);
}
