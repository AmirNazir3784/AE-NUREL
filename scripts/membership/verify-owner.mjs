import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Secrets are read only from an ignored private file, never CLI arguments,
// source defaults or output. Sessions remain in memory and are signed out.
//
// S5-38: this script used to POST the real owner password to the
// activation endpoint even when the owner was already activated (the
// activation was guaranteed to fail). It now checks state FIRST: for the
// `activate` action it tries a normal sign-in before any activation POST.
// If sign-in succeeds the owner already exists, the activation POST is
// skipped entirely, and the sign-in session is reused for the checks
// below. The activation token hash is no longer read from the repo —
// server/membership/owner-bootstrap.json is inert since the Step 5 fix;
// the hash lives only in the server env var
// AENURAL_OWNER_ACTIVATION_TOKEN_HASH.
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
// The owner account must never be created under the placeholder address
// (S5-13). If the operator set AENURAL_OWNER_EMAIL for this run it must
// match the credentials file; otherwise the file's address must simply
// be a real, non-placeholder email.
assert.equal(typeof credentials.email, 'string');
assert.notEqual(credentials.email.trim().toLowerCase(), 'owner@aenural.com', 'Owner credentials must use the real owner email, never the placeholder owner@aenural.com.');
assert.match(credentials.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Owner credentials email is not a valid email address.');
if (process.env.AENURAL_OWNER_EMAIL) assert.equal(credentials.email.trim().toLowerCase(), process.env.AENURAL_OWNER_EMAIL.trim().toLowerCase(), 'Owner credentials email does not match AENURAL_OWNER_EMAIL.');
assert.equal(typeof credentials.password, 'string');
assert.equal(typeof credentials.activationToken, 'string');
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

async function signIn() {
  const login = await request('/api/auth/sign-in/email', { email: credentials.email, password: credentials.password });
  if (login.response.status === 200) {
    cookie = login.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    assert.ok(cookie, 'Sign-in must set a real session cookie.');
  }
  return login;
}

try {
  let login = null;
  if (action === 'activate') {
    // State check first (S5-38): if the owner can already sign in, the
    // account exists and an activation POST would be pointless — skip it
    // instead of sending the live password to an endpoint that can only
    // reject it. A 401 here means "not activated yet" (or a wrong
    // password); only then is the activation POST attempted.
    const probe = await signIn();
    if (probe.response.status === 200) {
      login = probe;
      console.log(JSON.stringify({ action: 'activate', status: 200, alreadyActivated: true, skippedActivationPost: true }));
    } else {
      assert.equal(probe.response.status, 401, `Owner sign-in probe HTTP ${probe.response.status}`);
      const result = await request('/api/membership/activate-owner', {
        token: credentials.activationToken, password: credentials.password,
      });
      // Activation answers one generic 403 for every failure (wrong
      // token, weak password, already activated, consumed token — S5-11),
      // so a 403 alone cannot tell "already active" from "failed". A
      // sign-in probe distinguishes them without another activation POST.
      if (result.response.status === 403) {
        const after = await signIn();
        if (after.response.status === 200) {
          login = after;
          console.log(JSON.stringify({ action: 'activate', status: 403, alreadyActivated: true }));
        } else {
          assert.fail(`Owner activation HTTP 403 and owner sign-in still fails — activation did not succeed (check the token, the env hash, and the owner email).`);
        }
      } else {
        // A replay cannot reset an existing owner. Only a successful real sign-in
        // below can establish that the stored credentials actually work.
        assert.equal(result.response.status, 200, `Owner activation HTTP ${result.response.status}`);
        console.log(JSON.stringify({ action: 'activate', status: result.response.status, alreadyActivated: false }));
      }
    }
  }

  const visitor = await request('/api/membership/access');
  assert.equal(visitor.response.status, 200);
  assert.equal(visitor.data.user, null);
  assert.equal(visitor.data.access.premium, false);
  assert.equal(visitor.data.access.owner, false);
  assert.equal(visitor.data.access.watermark, true);
  assert.equal(visitor.data.access.presets.length, 5);

  if (!login) login = await signIn();
  assert.equal(login.response.status, 200, `Owner sign-in HTTP ${login.response.status}`);
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
