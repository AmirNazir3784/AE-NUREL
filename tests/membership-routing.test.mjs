// Routing test (S5-30): /api/membership/access must be served by its
// static route, not by the [...path] catch-all — so the anonymous access
// branch deleted from the catch-all is genuinely unreachable, and
// anonymous access keeps the static route's handling (including its
// owner-test guest limiting). Pure file checks: no Next.js runtime,
// no database, no node_modules needed.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

describe('membership routing (S5-30)', () => {
  it('serves /api/membership/access from the static route, not the catch-all', () => {
    const staticRoute = 'src/app/api/membership/access/route.ts';
    assert.ok(existsSync(path.join(root, staticRoute)), 'static access route must exist');
    const staticSrc = read(staticRoute);
    assert.match(staticSrc, /export async function GET/, 'static access route exports GET');
    assert.match(staticSrc, /limitOperation/, 'static access route limits anonymous owner-test access');
    const catchAll = read('src/app/api/membership/[...path]/route.ts');
    assert.doesNotMatch(
      catchAll,
      /route\s*===\s*'access'\s*&&\s*!member/,
      'catch-all must not contain the deleted anonymous access branch',
    );
    assert.match(catchAll, /unreachable/, 'catch-all documents why the branch was deleted');
  });
  it('rate-limits the pending-verification branches in the catch-all', () => {
    const catchAll = read('src/app/api/membership/[...path]/route.ts');
    assert.match(catchAll, /checkAnonymousRouteLimit\(`status:/, 'GET pending-verification is throttled');
    assert.match(catchAll, /checkAnonymousRouteLimit\(`resend:/, 'POST pending-verification/resend is throttled');
  });
});
