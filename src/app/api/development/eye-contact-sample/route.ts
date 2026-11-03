// Fixed public-image QA fixture only; never accepts a filesystem path.
// The fixture is ignored, excluded from deployment tracing, and unavailable
// outside development. See docs/eye-contact-development.md for its origin.
export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  try {
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(process.cwd() + "/artifacts/eye-contact/motion-test.mp4");
    return new Response(bytes, { headers: { "Content-Type": "video/mp4", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  } catch { return new Response("Test fixture is not installed.", { status: 404 }); }
}
