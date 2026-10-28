"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ManagedEvent } from "@/lib/admin";
import { getLocalPreviewEvents, saveLocalPreviewEvents } from "@/lib/admin-preview";
import "./admin.css";

const emptyEvent = (): ManagedEvent => ({ slug: "", title: "", detail: "", description: "", date: "", location: "", image: "", gallery: [], instagramUrl: "", status: "current", published: true });

function localToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || "Something went wrong. Please try again.";
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [event, setEvent] = useState<ManagedEvent>(emptyEvent);
  const [filter, setFilter] = useState<"all" | "current" | "past">("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      const rows = getLocalPreviewEvents() ?? [];
      setEvents(rows);
      return rows;
    }
    const response = await fetch("/api/admin/events", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseError(response));
    const rows = await response.json() as ManagedEvent[];
    setEvents(rows);
    return rows;
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setAuthenticated(true);
      setChecking(false);
      return;
    }
    fetch("/api/admin/session", { cache: "no-store" }).then(async (response) => {
      if (response.status === 503) setConfigured(false);
      const body = await response.json().catch(() => ({})) as { authenticated?: boolean };
      if (body.authenticated) setAuthenticated(true);
    }).catch(() => setConfigured(false)).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (authenticated) loadEvents().then((rows) => {
      if (rows.length) { setSelectedSlug(rows[0].slug); setEvent(rows[0]); }
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load events."));
  }, [authenticated, loadEvents]);

  const visibleEvents = useMemo(() => filter === "all" ? events : events.filter((item) => item.status === filter), [events, filter]);

  function editEvent(item: ManagedEvent) {
    setSelectedSlug(item.slug);
    setEvent({ ...item, gallery: [...item.gallery] });
    setMessage("");
    setError("");
  }

  function startNew() {
    setSelectedSlug("");
    setEvent(emptyEvent());
    setMessage("");
    setError("");
  }

  function update<K extends keyof ManagedEvent>(key: K, value: ManagedEvent[K]) {
    setEvent((current) => ({ ...current, [key]: value }));
  }

  async function signIn(submit: React.FormEvent<HTMLFormElement>) {
    submit.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!response.ok) throw new Error(await responseError(response));
      setAuthenticated(true); setUsername(""); setPassword("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function upload(fileList: FileList | null, gallery = false) {
    if (!fileList?.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      for (const file of Array.from(fileList)) {
        if (process.env.NODE_ENV === "development") {
          if (file.size > 4 * 1024 * 1024) throw new Error("Local preview uploads are limited to 4 MB per image so they fit in browser storage.");
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read this image."));
            reader.onerror = () => reject(new Error("Could not read this image."));
            reader.readAsDataURL(file);
          });
          setEvent((current) => ({ ...current, image: gallery && current.image ? current.image : dataUrl, gallery: [...current.gallery, dataUrl] }));
          continue;
        }
        const data = new FormData(); data.set("file", file); data.set("folder", "events");
        const response = await fetch("/api/admin/upload", { method: "POST", body: data });
        if (!response.ok) throw new Error(await responseError(response));
        const result = await response.json() as { url: string };
        setEvent((current) => ({ ...current, image: gallery && current.image ? current.image : result.url, gallery: [...current.gallery, result.url] }));
      }
      if (process.env.NODE_ENV === "development") setMessage("Local preview image added. Save the event to keep it in this browser.");
      else setMessage("Image uploaded. Save the event to publish it.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  async function saveEvent(form: React.FormEvent<HTMLFormElement>) {
    form.preventDefault(); setBusy(true); setError(""); setMessage("");
    if (event.status === "upcoming" && (!event.date || event.date < localToday())) {
      setError("Choose today or a future date for an upcoming event."); setBusy(false); return;
    }
    if (!event.image.trim()) { setError("Add a cover image before saving this event."); setBusy(false); return; }
    const payload = { ...event, slug: event.slug.trim() || event.title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) };
    try {
      if (process.env.NODE_ENV === "development") {
        const rows = getLocalPreviewEvents() ?? [];
        const next = [...rows.filter((item) => item.slug !== payload.slug), payload];
        saveLocalPreviewEvents(next);
        setEvents(next); setSelectedSlug(payload.slug); setEvent(payload); setMessage("Saved in local preview storage.");
        return;
      }
      const response = await fetch("/api/admin/events", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(await responseError(response));
      setSelectedSlug(payload.slug); setEvent(payload); setMessage("Event saved.");
      await loadEvents();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the event."); }
    finally { setBusy(false); }
  }

  async function deleteEvent() {
    if (!selectedSlug || !window.confirm(`Delete “${event.title}”? This cannot be undone.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (process.env.NODE_ENV === "development") {
        const remaining = (getLocalPreviewEvents() ?? []).filter((item) => item.slug !== selectedSlug);
        saveLocalPreviewEvents(remaining); setEvents(remaining); setSelectedSlug(""); setEvent(emptyEvent()); setMessage("Removed from local preview storage.");
        return;
      }
      const response = await fetch(`/api/admin/events/${encodeURIComponent(selectedSlug)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      const remaining = events.filter((item) => item.slug !== selectedSlug);
      setEvents(remaining); setSelectedSlug(""); setEvent(emptyEvent()); setMessage("Event deleted.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete the event."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (process.env.NODE_ENV === "development" || !configured) { setAuthenticated(false); return; }
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    setAuthenticated(false); setEvents([]); setSelectedSlug(""); setEvent(emptyEvent());
  }

  if (checking) return <main className="admin-page"><div className="admin-loading">Opening the studio…</div></main>;

  if (!authenticated) return (
    <main className="admin-page admin-login-page">
      <Link href="/" className="admin-back-link">← Back to Shega Events</Link>
      <form className="admin-login-card" onSubmit={signIn}>
        <span className="admin-kicker">SHEGA EVENTS · CONTENT STUDIO</span>
        <h1>Welcome<br />back.</h1>
        <p>Sign in to manage events and their photo galleries.</p>

        {!configured && (
          <div className="admin-alert">
            Admin configuration missing. Configure your Cloudflare secrets to enable sign in.
          </div>
        )}

        <label htmlFor="admin-username">Admin username</label>
        <input
          id="admin-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="admin"
        />

        <label htmlFor="admin-password">Admin password</label>
        <div className="admin-password-wrap">
          <input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <button
            type="button"
            className="admin-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <button className="admin-primary-button" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}<span>↗</span>
        </button>
      </form>
    </main>
  );

  return (
    <main className="admin-page">
      <header className="admin-topbar"><Link href="/" className="admin-brand"><span className="admin-brand-mark">S</span><span>SHEGA <i>CONTENT STUDIO</i></span></Link><div>{(process.env.NODE_ENV === "development" || !configured) && <span className="admin-local-badge">LOCAL PREVIEW · changes stay here</span>}<Link href="/admin/blog">Manage blog</Link><a href="/" target="_blank" rel="noreferrer">View site ↗</a><button type="button" onClick={signOut}>Sign out</button></div></header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-heading"><div><span className="admin-kicker">YOUR CONTENT</span><h2>Events</h2></div><button type="button" className="admin-add-button" onClick={startNew}>＋</button></div>
          <div className="admin-filters">{(["all", "current", "past"] as const).map((value) => <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All" : value === "current" ? "Current" : "Past"}</button>)}</div>
          <div className="admin-event-list">{visibleEvents.map((item) => <button type="button" key={item.slug} className={`admin-event-row ${selectedSlug === item.slug ? "active" : ""}`} onClick={() => editEvent(item)}><span className="admin-event-thumb" style={{ backgroundImage: item.image ? `url("${item.image}")` : undefined }} /><span className="admin-event-row-copy"><strong>{item.title || "Untitled event"}</strong><small>{item.status} · {item.published ? "Published" : "Draft"}</small></span><span className="admin-event-arrow">↗</span></button>)}</div>
          <div className="admin-sidebar-foot">{events.length} events in your collection</div>
        </aside>

        <section className="admin-editor">
          <div className="admin-editor-heading"><div><span className="admin-kicker">EVENT DETAILS</span><h1>{selectedSlug ? "Edit event" : "Create an event"}</h1><p>Keep your portfolio fresh. Add an event and its photo gallery here.</p></div>{selectedSlug && <button className="admin-delete-button" type="button" onClick={deleteEvent} disabled={busy}>Delete event</button>}</div>
          <form className="admin-event-form" onSubmit={saveEvent}>
            <div className="admin-form-grid">
              <label className="admin-field admin-span-two">Event name<input value={event.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Bermel Fest" required maxLength={140} /></label>
              <label className="admin-field">Event status<select value={event.status} onChange={(e) => update("status", e.target.value as ManagedEvent["status"])}><option value="current">Current event</option><option value="upcoming">Upcoming event</option><option value="past">Past event</option></select></label>
              <label className="admin-field">Event date<input type="date" value={event.date} min={event.status === "upcoming" ? localToday() : undefined} onChange={(e) => update("date", e.target.value)} required={event.status === "upcoming"} /></label>
              <label className="admin-field">Location<input value={event.location} onChange={(e) => update("location", e.target.value)} placeholder="Addis Ababa, Ethiopia" maxLength={160} /></label>
              <label className="admin-field">Short description<input value={event.detail} onChange={(e) => update("detail", e.target.value)} placeholder="Concert · Live experience" maxLength={240} /></label>
              <label className="admin-field admin-span-two">About this event<textarea value={event.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Tell people what made this event special…" maxLength={5000} /></label>
              <label className="admin-field admin-span-two">Instagram post URL<input type="url" value={event.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} placeholder="https://www.instagram.com/…" /></label>
            </div>

            <div className="admin-media-section"><div className="admin-media-heading"><div><span className="admin-kicker">EVENT PHOTOS</span><h2>Cover & gallery</h2></div><span>{event.gallery.length} photos</span></div>
              <label className="admin-upload-cover"><span className="admin-cover-preview" style={{ backgroundImage: event.image ? `url("${event.image}")` : undefined }}>{!event.image && <b>Choose a cover image</b>}</span><span className="admin-upload-copy"><strong>Cover image</strong><small>Displayed on the event card. JPG, PNG, WebP or GIF · {process.env.NODE_ENV === "development" ? "up to 4 MB in local preview" : "up to 12 MB"}</small><em>Upload cover image</em></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => upload(e.target.files)} /></label>
              <div className="admin-gallery-grid">{event.gallery.map((image, index) => <div key={`${image}-${index}`} className={`admin-gallery-image ${event.image === image ? "is-cover" : ""}`}><img src={image} alt={`Event gallery photo ${index + 1}`} /><button type="button" onClick={() => update("image", image)} aria-label="Set as cover">{event.image === image ? "Cover" : "Set cover"}</button><button type="button" className="admin-remove-photo" onClick={() => update("gallery", event.gallery.filter((_, photoIndex) => photoIndex !== index))} aria-label="Remove photo">×</button></div>)}<label className="admin-gallery-add"><span>＋</span><strong>Add photos</strong><small>Upload multiple images</small><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => upload(e.target.files, true)} /></label></div>
            </div>

            <div className="admin-publish-row"><div><strong>Publish this event</strong><small>Published events are visible on the website.</small></div><button type="button" role="switch" aria-checked={event.published} className={`admin-toggle ${event.published ? "on" : ""}`} onClick={() => update("published", !event.published)}><span /></button></div>
            {(error || message) && <div className={error ? "admin-alert" : "admin-success"}>{error || message}</div>}
            <div className="admin-form-actions"><button type="button" className="admin-cancel-button" onClick={startNew}>Clear form</button><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? "Saving…" : "Save event"}<span>↗</span></button></div>
          </form>
        </section>
      </div>
    </main>
  );
}
