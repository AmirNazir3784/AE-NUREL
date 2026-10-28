import { ownerTestEnabled } from '@/lib/membership-config';
import { memberService } from '@/lib/member-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!ownerTestEnabled()) return Response.json({ message: 'Not found.' }, { status: 404, headers });
  try {
    const { membershipConfig } = await import('../../../../../server/membership/config.mjs');
    const config = membershipConfig();
    if (!config || request.headers.get('origin') !== config.origin) return Response.json({ message: 'This request could not be verified.' }, { status: 403, headers });
    if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ message: 'Send JSON.' }, { status: 415, headers });
    const reader = request.body?.getReader(); let length = 0; const chunks: Uint8Array[] = [];
    if (reader) for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 2048) { await reader.cancel(); return Response.json({ message: 'Request too large.' }, { status: 413, headers }); } chunks.push(part.value); }
    const service = await memberService();
    const { membershipDatabase } = await import('../../../../../server/membership/database.mjs');
    const { activateOwner } = await import('../../../../../server/membership/owner-activation.mjs');
    const { db } = await membershipDatabase();
    const { ensureGuest } = await import('../../../../../server/membership/guest.mjs');
    await ensureGuest(db, 'owner-activation');
    await service.limitOperation('owner-activation', 'activate', 5);
    const result = await activateOwner(db, config, JSON.parse(Buffer.concat(chunks).toString('utf8')));
    return Response.json(result, { headers });
  } catch (error) {
    const issue = error as { status?: number; message?: string };
    return Response.json({ message: issue.status ? issue.message : 'Owner activation is temporarily unavailable.' }, { status: issue.status || 503, headers });
  }
}
