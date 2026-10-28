"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { emptyPost, getYouTubeEmbedUrl, type ManagedPost } from "@/lib/blog";
import { getLocalPreviewPosts, saveLocalPreviewPosts } from "@/lib/blog-preview";
import "../admin.css";

const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
async function responseError(response: Response) { const body = await response.json().catch(() => ({})) as { error?: string }; return body.error || "Something went wrong. Please try again."; }
async function readLocalImage(file: File) {
  if (file.size > 4 * 1024 * 1024) throw new Error("Local preview images must be 4 MB or smaller.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read this image."));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

export default function BlogAdminPage() {
  const [checking, setChecking] = useState(true), [authenticated, setAuthenticated] = useState(false), [posts, setPosts] = useState<ManagedPost[]>([]), [post, setPost] = useState<ManagedPost>(emptyPost()), [selectedSlug, setSelectedSlug] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const loadPosts = useCallback(async () => { if (process.env.NODE_ENV === "development") { const rows = getLocalPreviewPosts() ?? []; setPosts(rows); return rows; } const response = await fetch("/api/admin/posts", { cache: "no-store" }); if (!response.ok) throw new Error(await responseError(response)); const rows = await response.json() as ManagedPost[]; setPosts(rows); return rows; }, []);
  useEffect(() => { if (process.env.NODE_ENV === "development") { setAuthenticated(true); setChecking(false); return; } fetch("/api/admin/session", { cache: "no-store" }).then(async (response) => { const data = await response.json().catch(() => ({})) as { authenticated?: boolean }; setAuthenticated(Boolean(data.authenticated)); }).finally(() => setChecking(false)); }, []);
  useEffect(() => { if (authenticated) loadPosts().then((rows) => { if (rows[0]) { setPost(rows[0]); setSelectedSlug(rows[0].slug); } }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load posts.")); }, [authenticated, loadPosts]);
  const update = <K extends keyof ManagedPost>(key: K, value: ManagedPost[K]) => setPost((current) => ({ ...current, [key]: value }));
  function createPost() { setSelectedSlug(""); setPost(emptyPost()); setMessage(""); setError(""); }
  async function uploadImage(file: File) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error("Choose a JPG, PNG, WebP or GIF image.");
    if (process.env.NODE_ENV === "development") return readLocalImage(file);
    const data = new FormData(); data.set("file", file); data.set("folder", "blog");
    const response = await fetch("/api/admin/upload", { method: "POST", body: data });
    if (!response.ok) throw new Error(await responseError(response));
    return (await response.json() as { url: string }).url;
  }
  async function uploadCover(fileList: FileList | null) {
    const file = fileList?.[0]; if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try { update("image", await uploadImage(file)); setMessage(process.env.NODE_ENV === "development" ? "Cover added to local preview. Save the story to keep it in this browser." : "Cover uploaded. Save the story to publish it."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not upload this cover."); }
    finally { setBusy(false); }
  }
  async function uploadStoryPhotos(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : []; if (!files.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if ((post.images ?? []).length + files.length > 30) throw new Error("A story can have up to 30 photos.");
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await uploadImage(file));
      setPost((current) => ({ ...current, images: [...(current.images ?? []), ...uploaded] }));
      setMessage(process.env.NODE_ENV === "development" ? "Photos added to local preview. Save the story to keep them in this browser." : "Photos uploaded. Save the story to publish them.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not upload these photos."); }
    finally { setBusy(false); }
  }
  async function savePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const youtubeUrls = (post.youtubeUrls ?? []).map((url) => url.trim()).filter(Boolean);
    if (youtubeUrls.some((url) => !getYouTubeEmbedUrl(url))) { setError("Add a valid YouTube video or Shorts link (youtube.com or youtu.be)."); setBusy(false); return; }
    const payload = { ...post, images: post.images ?? [], youtubeUrls, slug: post.slug.trim() || slugify(post.title), publishedAt: post.publishedAt || new Date().toISOString() };
    try {
      if (process.env.NODE_ENV === "development") {
        const next = [...(getLocalPreviewPosts() ?? []).filter((item) => item.slug !== payload.slug), payload];
        saveLocalPreviewPosts(next); setPosts(next); setPost(payload); setSelectedSlug(payload.slug); setMessage("Saved in local preview storage."); return;
      }
      const response = await fetch("/api/admin/posts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(await responseError(response));
      const result = await response.json() as { post: ManagedPost };
      setPost(result.post); setSelectedSlug(result.post.slug); setMessage("Post saved."); await loadPosts();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save post."); }
    finally { setBusy(false); }
  }
  async function deletePost() { if (!selectedSlug || !window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return; setBusy(true); try { const response = await fetch(`/api/admin/posts/${encodeURIComponent(selectedSlug)}`, { method: "DELETE" }); if (!response.ok) throw new Error(await responseError(response)); setPosts((current) => current.filter((item) => item.slug !== selectedSlug)); createPost(); setMessage("Post deleted."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete post."); } finally { setBusy(false); } }
  if (checking) return <main className="admin-page"><div className="admin-loading">Opening the studio…</div></main>;
  if (!authenticated) return <main className="admin-page admin-login-page"><div className="admin-login-card"><h1>Sign in<br />required.</h1><p>Return to the content studio to sign in before managing journal posts.</p><Link className="admin-primary-button" href="/admin">Go to content studio</Link></div></main>;
  return <main className="admin-page"><header className="admin-topbar"><Link href="/" className="admin-brand"><span className="admin-brand-mark">S</span><span>SHEGA <i>CONTENT STUDIO</i></span></Link><div><Link href="/admin">Manage events</Link><a href="/blog" target="_blank" rel="noreferrer">View journal ↗</a></div></header><div className="admin-layout"><aside className="admin-sidebar"><div className="admin-sidebar-heading"><div><span className="admin-kicker">YOUR CONTENT</span><h2>Journal</h2></div><button type="button" className="admin-add-button" onClick={createPost}>＋</button></div><div className="admin-event-list">{posts.map((item) => <button type="button" key={item.slug} className={`admin-event-row ${selectedSlug === item.slug ? "active" : ""}`} onClick={() => { setSelectedSlug(item.slug); setPost({ ...item, images: item.images ?? [], youtubeUrls: item.youtubeUrls ?? [] }); setMessage(""); setError(""); }}><span className="admin-event-thumb" style={{ backgroundImage: item.image ? `url("${item.image}")` : undefined }} /><span className="admin-event-row-copy"><strong>{item.title || "Untitled story"}</strong><small>{item.published ? "Published" : "Draft"}</small></span><span className="admin-event-arrow">↗</span></button>)}</div><div className="admin-sidebar-foot">{posts.length} stories in your journal</div></aside><section className="admin-editor"><div className="admin-editor-heading"><div><span className="admin-kicker">JOURNAL POST</span><h1>{selectedSlug ? "Edit story" : "Write a story"}</h1><p>Publish updates, behind the scenes stories, and event recaps to the website.</p></div>{selectedSlug && <button className="admin-delete-button" type="button" onClick={deletePost} disabled={busy}>Delete story</button>}</div><form className="admin-event-form" onSubmit={savePost}><div className="admin-form-grid"><label className="admin-field admin-span-two">Story title<input value={post.title} onChange={(event) => update("title", event.target.value)} required maxLength={160} /></label><label className="admin-field">Author<input value={post.author} onChange={(event) => update("author", event.target.value)} required maxLength={100} /></label><label className="admin-field">Publish date<input type="date" value={post.publishedAt ? post.publishedAt.slice(0, 10) : ""} onChange={(event) => update("publishedAt", event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : "")} /></label><label className="admin-field admin-span-two">Summary<input value={post.excerpt} onChange={(event) => update("excerpt", event.target.value)} required maxLength={280} /></label><label className="admin-field admin-span-two">Cover image URL<input type="text" value={post.image} onChange={(event) => update("image", event.target.value)} required placeholder="Upload an image or paste an https:// URL" /></label><label className="admin-field admin-span-two">Upload cover from your device<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { void uploadCover(event.target.files); event.target.value = ""; }} /></label><label className="admin-field admin-span-two">Story<textarea value={post.content} onChange={(event) => update("content", event.target.value)} required rows={14} placeholder="Leave a blank line between paragraphs." maxLength={12000} /></label><label className="admin-field admin-span-two">YouTube video links<textarea value={(post.youtubeUrls ?? []).join("\n")} onChange={(event) => update("youtubeUrls", event.target.value.split("\n").map((url) => url.trim()).filter(Boolean))} rows={3} placeholder="Paste one YouTube video or Shorts link per line." /></label></div><section className="admin-media-section"><div className="admin-media-heading"><div><span className="admin-kicker">STORY PHOTOS</span><h2>Photos from your device</h2></div><span>{(post.images ?? []).length} photos</span></div><label className="blog-photo-picker">Choose photos<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={(event) => { void uploadStoryPhotos(event.target.files); event.target.value = ""; }} /><small>JPG, PNG, WebP or GIF. Up to 12 MB each in production.</small></label><div className="blog-photo-grid">{(post.images ?? []).map((image, index) => <div className="blog-photo-item" key={`${image.slice(0, 80)}-${index}`}><img src={image} alt={`Story photo ${index + 1}`} /><button type="button" className="admin-remove-photo" aria-label={`Remove story photo ${index + 1}`} onClick={() => update("images", (post.images ?? []).filter((_, photoIndex) => photoIndex !== index))}>Remove</button></div>)}</div></section><div className="admin-publish-row"><div><strong>Publish this story</strong><small>Published stories are visible on the home page and journal.</small></div><button type="button" role="switch" aria-checked={post.published} className={`admin-toggle ${post.published ? "on" : ""}`} onClick={() => update("published", !post.published)}><span /></button></div>{(error || message) && <div className={error ? "admin-alert" : "admin-success"}>{error || message}</div>}<div className="admin-form-actions"><button type="button" className="admin-cancel-button" onClick={createPost}>Clear form</button><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? "Saving…" : "Save story"}<span>↗</span></button></div></form></section></div></main>;
}
