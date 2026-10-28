import { membershipEnabled } from "@/lib/membership-config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const unavailable = () => Response.json({ message: "Account services are unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
async function handle(request: Request) {
  if (!membershipEnabled()) return new Response(null, { status: 404 });
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
