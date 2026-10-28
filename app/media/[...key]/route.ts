import { getAdminEnv } from "@/lib/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const env = await getAdminEnv();
    if (!env.MEDIA) return new Response("Media storage is not configured.", { status: 404 });
    const { key: parts } = await params;
    const key = parts.join("/");
    if ((!key.startsWith("events/") && !key.startsWith("blog/")) || key.includes("..")) return new Response("Not found.", { status: 404 });
    const object = await env.MEDIA.get(key);
    if (!object) return new Response("Not found.", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  } catch {
    return new Response("Media storage is unavailable.", { status: 503 });
  }
}
