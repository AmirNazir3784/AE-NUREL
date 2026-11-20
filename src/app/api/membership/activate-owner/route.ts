import { ownerTestEnabled } from '@/lib/membership-config';
import { memberService } from '@/lib/member-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-process lockout tracker for activation attempts (S5-12). Kept on
// globalThis (not module scope) because this route's server imports are
// dynamic by design — a static import of server/membership code here
// would initialise auth before the owner-test gate below runs. Next.js
// keeps one server instance per process, so one tracker per process is
// exactly the intended scope; the DB-backed limitOperation buckets are
// the durable control, this tracker is the progressive back-off on top.
type OwnerActivationAttempts = {
  isLockedOut(ip: string): boolean;
  recordFailure(ip: string): void;
  recordSuccess(ip: string): void;
};
async function ownerActivationAttempts(): Promise<OwnerActivationAttempts> {
  const store = globalThis as unknown as { __aenuralOwnerActivationAttempts?: OwnerActivationAttempts };
  const existing = store.__aenuralOwnerActivationAttempts;
  if (existing) return existing;
  const { createOwnerActivationAttemptTracker } = await import('../../../../../server/membership/owner-activation.mjs');
  const tracker: OwnerActivationAttempts = createOwnerActivationAttemptTracker();
  store.__aenuralOwnerActivationAttempts = tracker;
  return tracker;
}

// Server-side attempt log (S5-12): timestamp, client IP and outcome code
// only. NEVER the token, the password, or the owner email.
function logActivationAttempt(ip: string, outcome: string, status: number) {
  console.warn(JSON.stringify({ event: 'owner-activation-attempt', at: new Date().toISOString(), ip, outcome, status }));
}
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  // Client IP for limiting/logging only (never authentication). Set once
  // the config is loaded; the catch block reuses it for failure logging.
  let clientIp = 'unknown';
  if (!ownerTestEnabled()) return Response.json({ message: 'Not found.' }, { status: 404, headers });
  try {
    const { membershipConfig } = await import('../../../../../server/membership/config.mjs');
    const config = membershipConfig();
    // NOTE (S5-23): this Origin check is CSRF-only — a browser cannot
    // forge Origin, so it stops cross-site form/fetch abuse. It is NOT
    // authentication: any non-browser caller can send any Origin it
    // likes. The activation token is the ONLY credential on this
    // endpoint; a matching Origin must never be treated as trust.
    if (!config || request.headers.get('origin') !== config.origin) return Response.json({ message: 'This request could not be verified.' }, { status: 403, headers });
    if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ message: 'Send JSON.' }, { status: 415, headers });
    const reader = request.body?.getReader(); let length = 0; const chunks: Uint8Array[] = [];
    if (reader) for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 2048) { await reader.cancel(); return Response.json({ message: 'Request too large.' }, { status: 413, headers }); } chunks.push(part.value); }
    const service = await memberService();
    const { membershipDatabase } = await import('../../../../../server/membership/database.mjs');
    const { activateOwner, ownerActivationClientIp } = await import('../../../../../server/membership/owner-activation.mjs');
    const { db } = await membershipDatabase();
    const { ensureGuest } = await import('../../../../../server/membership/guest.mjs');
    await ensureGuest(db, 'owner-activation');
    // Client IP for limiting/logging only (never authentication). The
    // trusted-header name comes from config; the helper falls back to
    // 'x-real-ip' and to 'unknown' when nothing usable is present.
    clientIp = ownerActivationClientIp(request.headers, config.env?.AUTH_TRUSTED_IP_HEADER);
    const attempts = await ownerActivationAttempts();
    // Progressive lockout (S5-12): 5 consecutive failures from one IP
    // lock that IP out for 10 minutes. Checked before any limiter spend.
    if (attempts.isLockedOut(clientIp)) {
      logActivationAttempt(clientIp, 'locked-out', 429);
      return Response.json({ message: 'Too many requests. Please wait a while and try again.' }, { status: 429, headers });
    }
    // Global backstop (pre-existing): 5 attempts/minute for the whole
    // internet. Kept as-is; the per-IP bucket below is the real control,
    // so one attacker can no longer burn the owner's only attempts.
    await service.limitOperation('owner-activation', 'activate', 5);
    // Per-IP limit (S5-12): 5 attempts/minute per client IP. The bucket
    // is keyed under the 'owner-activation' guest row (created above),
    // whose id satisfies the operation-limits foreign key; the scope
    // carries the IP, so each IP gets its own counter.
    try {
      await service.limitOperation('owner-activation', 'activate:' + clientIp, 5);
    } catch (error) {
      const issue = error as { status?: number };
      if (issue?.status === 429) logActivationAttempt(clientIp, 'rate-limited', 429);
      throw error;
    }
    const result = await activateOwner(db, config, JSON.parse(Buffer.concat(chunks).toString('utf8')));
    attempts.recordSuccess(clientIp);
    logActivationAttempt(clientIp, 'success', 200);
    return Response.json(result, { headers });
  } catch (error) {
    const issue = error as { status?: number; message?: string };
    const status = issue.status || 503;
    // A 403 here is the single generic activation failure (wrong token,
    // weak password, placeholder email, already activated, consumed or
    // malformed token — indistinguishable by design, S5-11). Count it
    // as a failed attempt for the lockout tracker; anything else is not
    // a guess and does not count.
    if (status === 403) {
      try {
        (await ownerActivationAttempts()).recordFailure(clientIp);
        logActivationAttempt(clientIp, 'rejected', 403);
      } catch {
        // Logging/tracking must never turn a rejection into a 500.
      }
    } else if (status !== 429) {
      logActivationAttempt(clientIp, 'error', status);
    }
    return Response.json({ message: issue.status ? issue.message : 'Owner activation is temporarily unavailable.' }, { status, headers });
  }
}
