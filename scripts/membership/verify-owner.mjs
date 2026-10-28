import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';

// Secrets are read only from an ignored private file, never CLI arguments,
// source defaults or output. Sessions remain in memory and are signed out.
const action = process.argv[2] ?? 'verify';
assert.ok(['activate', 'verify'].includes(action), 'Use activate or verify.');
const origin = new URL(process.argv[3] ?? 'https://aenural.com');
assert.ok(
  origin.origin === 'https://aenural.com' ||
  origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname),
  'Owner credentials can only be sent to aenural.com or a loopback QA server.',
);
assert.equal(origin.pathname + origin.search + origin.hash, '/');
assert.equal(origin.username + origin.password, '');
const requestOrigin = process.argv[4] ?? origin.origin;
assert.ok(requestOrigin === origin.origin || ['localhost', '127.0.0.1'].includes(origin.hostname) && requestOrigin === 'https://aenural.com', 'A different public auth origin is allowed only for loopback production QA.');
const credentials = JSON.parse(await readFile(new URL('../../.aenural-local/owner-credentials.json', import.meta.url), 'utf8'));
const bootstrap = JSON.parse(await readFile(new URL('../../server/membership/owner-bootstrap.json', import.meta.url), 'utf8'));
assert.equal(credentials.email, bootstrap.email);
assert.equal(typeof credentials.password, 'string');
let cookie = '';

async function request(path, body, authenticated = false) {
  const response = await fetch(new URL(path, origin), {
    method: body === undefined ? 'GET' : 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
    headers: {
      origin: requestOrigin,
      'Cache-Control': 'no-cache',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(authenticated ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

try {
  if (action === 'activate') {
    assert.equal(createHash('sha256').update(credentials.activationToken).digest('hex'), bootstrap.activationTokenHash);
    const result = await request('/api/membership/activate-owner', {
      token: credentials.activationToken, password: credentials.password,
    });
    // A replay cannot reset an existing owner. Only a successful real sign-in
    // below can establish that the stored credentials actually work.
    assert.ok([200, 410].includes(result.response.status), `Owner activation HTTP ${result.response.status}`);
    console.log(JSON.stringify({ action: 'activate', status: result.response.status, alreadyActivated: result.response.status === 410 }));
  }

  const visitor = await request('/api/membership/access');
  assert.equal(visitor.response.status, 200);
  assert.equal(visitor.data.user, null);
  assert.equal(visitor.data.access.premium, false);
  assert.equal(visitor.data.access.owner, false);
  assert.equal(visitor.data.access.watermark, true);
  assert.equal(visitor.data.access.presets.length, 5);

  const login = await request('/api/auth/sign-in/email', { email: credentials.email, password: credentials.password });
  assert.equal(login.response.status, 200, `Owner sign-in HTTP ${login.response.status}`);
  cookie = login.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie, 'Sign-in must set a real session cookie.');
  assert.equal(login.data.user?.email, credentials.email);

  const owner = await request('/api/membership/access', undefined, true);
  assert.equal(owner.response.status, 200);
  assert.equal(owner.data.user?.email, credentials.email);
  for (const flag of ['owner', 'premium', 'signedIn', 'accurate', 'advanced']) assert.equal(owner.data.access[flag], true, flag);
  assert.equal(owner.data.access.watermark, false);
  assert.equal(owner.data.access.presets, null);
  assert.equal(owner.data.access.maxSeconds, 120);

  const otherLogin = await request('/api/auth/sign-in/email', { email: `not-owner-${randomUUID()}@example.invalid`, password: credentials.password });
  assert.equal(otherLogin.response.status, 401, 'Other emails must not accept the owner password.');
  const registration = await request('/api/auth/sign-up/email', { email: credentials.email, name: 'Owner', password: credentials.password });
  assert.equal(registration.response.status, 400);
  assert.equal(registration.data.code, 'EMAIL_PASSWORD_SIGN_UP_DISABLED', 'Public registration must be disabled.');
  console.log(JSON.stringify({ origin: origin.origin, email: credentials.email, authenticatedOwner: true, premium: true, advanced: true, accurate: true, allPresets: true, watermark: false, visitorPremium: false, publicRegistration: false, otherEmailLogin: false }));
} finally {
  if (cookie) {
    const logout = await request('/api/auth/sign-out', {}, true);
    assert.equal(logout.response.status, 200, 'QA session sign-out failed.');
    const afterLogout = await request('/api/membership/access', undefined, true);
    assert.equal(afterLogout.data.user, null);
    assert.equal(afterLogout.data.access.premium, false);
  }
}
