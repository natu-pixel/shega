import { getAdminEnv, hasAdminSession, isSameOrigin } from "@/lib/admin";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const env = await getAdminEnv();
    if (!await hasAdminSession(request, env.SESSION_SECRET)) return Response.json({ error: "Sign in to upload images." }, { status: 401 });
    if (!env.MEDIA) return Response.json({ error: "The MEDIA R2 binding is not configured." }, { status: 503 });
    const form = await request.formData();
    const file = form.get("file");
    const folder = form.get("folder");
    if (folder !== "events" && folder !== "blog") return Response.json({ error: "Choose a valid media folder." }, { status: 400 });
    if (!(file instanceof File) || !extensions[file.type] || file.size < 1 || file.size > 12 * 1024 * 1024) {
      return Response.json({ error: "Choose a JPG, PNG, WebP or GIF image up to 12 MB." }, { status: 400 });
    }
    const key = `${folder}/${crypto.randomUUID()}.${extensions[file.type]}`;
    await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
    return Response.json({ url: `/media/${key}` });
  } catch {
    return Response.json({ error: "Image upload failed." }, { status: 503 });
  }
}
