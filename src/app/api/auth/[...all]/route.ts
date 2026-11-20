import { membershipEnabled } from "@/lib/membership-config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const unavailable = () => Response.json({ message: "Account services are unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
// Defence-in-depth (Step 5, S5-17): Better Auth also checks origins, but
// this route must not depend on the library alone for CSRF. Same explicit
// same-origin check as the membership routes: non-GET requests whose
// Origin header does not match the configured origin are rejected here,
// before any auth work happens (and before the request body is read).
// A missing Origin header fails too, exactly like the membership routes.
function originAllowed(request: Request) {
  if (request.method === "GET") return true;
  const expected = process.env.BETTER_AUTH_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://aenural.com");
  return request.headers.get("origin") === new URL(expected).origin;
}
async function handle(request: Request) {
  if (!membershipEnabled()) return new Response(null, { status: 404 });
  if (!originAllowed(request)) return Response.json({ message: "This request could not be verified." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    if (request.method === "POST") {
      const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (reader) { for (;;) { const value = await reader.read(); if (value.done) break; size += value.value.length; if (size > 16384) { await reader.cancel(); return new Response(null,{status:413}); } chunks.push(value.value); } }
      const bytes = new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      request = new Request(request.url, { method:"POST", headers:request.headers, body:bytes });
    }
    const { membershipAuth } = await import("../../../../../server/membership/auth.mjs");
    const response = await (await membershipAuth()).handler(request);
    response.headers.set("Cache-Control", "no-store"); response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch { return unavailable(); }
}
export const GET = handle;
export const POST = handle;
