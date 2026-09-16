"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { instagramGalleryPosts } from "@/lib/instagram-gallery-media";
import {
  galleryEventIds, galleryEventNames, galleryMediaSummary,
  type GalleryEventId, type InstagramGalleryMedia, type InstagramGalleryPost,
} from "@/lib/instagram-gallery";
import { ArrowIcon, InstagramIcon } from "./icons";

function PlayIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z" fill="currentColor" /></svg>;
}

function MediaCard({ post, onOpen }: { post: InstagramGalleryPost; onOpen: (trigger: HTMLButtonElement) => void }) {
  const [failed, setFailed] = useState(false);
  const cover = post.media[0];
  const name = galleryEventNames[post.event];

  return (
    <article className="memory-frame" data-post-id={post.id}>
      {cover ? <button className="gallery-open" type="button" onClick={(event) => onOpen(event.currentTarget)} aria-label={`Open ${name} album: ${galleryMediaSummary(post.media)}`}>
        {!failed ? (
          <Image
            src={cover.type === "video" ? cover.poster : cover.src}
            alt={cover.alt}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
            onError={() => setFailed(true)}
          />
        ) : <span className="gallery-media-error">Preview unavailable. Visit Instagram below.</span>}
        <span className="gallery-open-shade" aria-hidden="true" />
        <span className="gallery-media-badge">{galleryMediaSummary(post.media)}</span>
        <span className="gallery-open-cue" aria-hidden="true">{cover.type === "video" ? <PlayIcon /> : <ArrowIcon diagonal />}</span>
        <span className="gallery-card-title">{name}</span>
      </button> : (
        <div className="gallery-unavailable">
          <InstagramIcon />
          <h3>{name}</h3>
          <p>This post&apos;s media is unavailable.<br />Open Instagram to check the original.</p>
        </div>
      )}
      <a className="memory-caption" href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit the ${name} post on Instagram (opens in a new tab)`}>
        <span><InstagramIcon /> Visit Instagram</span><ArrowIcon diagonal />
      </a>
    </article>
  );
}

function ViewerMedia({ media }: { media: InstagramGalleryMedia }) {
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const player = video.current;
    if (!player || media.type !== "video") return;
    // Restore the source if React replays effect setup after cleanup.
    player.setAttribute("src", media.src);
    return () => {
      player.pause();
      player.removeAttribute("src");
      player.load();
    };
  }, [media]);

  if (failed) return <p className="gallery-media-error" role="status">This media couldn&apos;t load. Use Visit Instagram to open the original post.</p>;
  if (media.type === "video") {
    return <video ref={video} src={media.src} poster={media.poster} controls playsInline preload="metadata" aria-label={media.alt} onError={() => setFailed(true)} />;
  }
  return <Image src={media.src} alt={media.alt} fill sizes="(min-width: 1200px) 1150px, 100vw" onError={() => setFailed(true)} />;
}

function GalleryViewer({ post, onClose }: { post: InstagramGalleryPost; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(0);
  const media = post.media[index];
  const name = galleryEventNames[post.event];

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (node.open) node.close();
    };
  }, []);

  useEffect(() => {
    const selected = thumbnails.current?.querySelector<HTMLButtonElement>('[aria-current="true"]');
    const moveFocus = thumbnails.current?.contains(document.activeElement);
    selected?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    if (moveFocus) selected?.focus({ preventScroll: true });
  }, [index]);

  function navigate(direction: number) {
    setIndex((current) => Math.max(0, Math.min(post.media.length - 1, current + direction)));
  }

  function handleKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Tab") {
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), a[href], video[controls]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.target instanceof HTMLVideoElement || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      navigate(event.key === "ArrowLeft" ? -1 : 1);
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setIndex(event.key === "Home" ? 0 : post.media.length - 1);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="gallery-dialog"
      aria-labelledby="gallery-viewer-title"
      aria-describedby="gallery-viewer-position"
      onKeyDown={handleKey}
      onClose={() => { if (!dialog.current?.open) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
    >
      <div className="gallery-viewer">
        <header className="gallery-viewer-header">
          <div>
            <p className="gallery-viewer-eyebrow">THE MOMENTS / {galleryMediaSummary(post.media)}</p>
            <h3 id="gallery-viewer-title">{name}</h3>
          </div>
          <button className="gallery-icon-button gallery-close" type="button" aria-label="Close gallery" onClick={() => dialog.current?.close()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
        </header>
        <div
          className={`gallery-viewer-media${media?.type === "image" ? " is-photo" : ""}`}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStart.current = media?.type === "image" && touch ? { x: touch.clientX, y: touch.clientY } : null;
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const touch = event.changedTouches[0];
            touchStart.current = null;
            if (start && touch) {
              const x = touch.clientX - start.x;
              const y = touch.clientY - start.y;
              if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.5) navigate(x < 0 ? 1 : -1);
            }
          }}
          onTouchCancel={() => { touchStart.current = null; }}
        >
          {media ? <ViewerMedia key={media.src} media={media} /> : <p className="gallery-media-error" role="status">Album media is unavailable. Visit Instagram to see this post.</p>}
          {post.media.length > 1 && (
            <div className="gallery-viewer-arrows">
              <button className="gallery-icon-button gallery-previous" type="button" aria-label="Previous photo or video" disabled={index === 0} onClick={() => navigate(-1)}><ArrowIcon /></button>
              <button className="gallery-icon-button" type="button" aria-label="Next photo or video" disabled={index === post.media.length - 1} onClick={() => navigate(1)}><ArrowIcon /></button>
            </div>
          )}
        </div>
        {post.media.length > 1 && (
          <div className="gallery-thumbnails" ref={thumbnails} role="group" aria-label="Album thumbnails">
            {post.media.map((item, mediaIndex) => (
              <button
                key={item.src}
                type="button"
                tabIndex={index === mediaIndex ? 0 : -1}
                aria-current={index === mediaIndex ? "true" : undefined}
                aria-label={`Show ${item.type === "video" ? "video" : "photo"} ${mediaIndex + 1} of ${post.media.length}`}
                onClick={() => setIndex(mediaIndex)}
              >
                <Image src={item.type === "video" ? item.poster : item.src} alt="" fill sizes="64px" />
                {item.type === "video" && <PlayIcon />}
              </button>
            ))}
          </div>
        )}
        <footer className="gallery-viewer-footer">
          <div>
            <p id="gallery-viewer-position" aria-live="polite" aria-atomic="true">{media?.type === "video" ? "Video" : "Photo"} {index + 1} / {post.media.length}</p>
            <p className="gallery-credit">Original post: @{post.credit}</p>
          </div>
          <a href={post.url} className="gallery-visit" target="_blank" rel="noopener noreferrer"><InstagramIcon /> Visit Instagram <ArrowIcon diagonal /></a>
        </footer>
      </div>
    </dialog>
  );
}

export function InstagramMoments() {
  const [filter, setFilter] = useState<GalleryEventId | "all">("all");
  const [selected, setSelected] = useState<InstagramGalleryPost | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const posts = filter === "all" ? instagramGalleryPosts : instagramGalleryPosts.filter((post) => post.event === filter);
  const unavailableCount = posts.filter((post) => post.media.length === 0).length;

  function closeGallery() {
    setSelected(null);
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <div className="gallery-filters" role="group" aria-label="Filter gallery by event">
        <button type="button" aria-pressed={filter === "all"} aria-controls="event-gallery" onClick={() => setFilter("all")}>All moments <span>{instagramGalleryPosts.length}</span></button>
        {galleryEventIds.map((id) => (
          <button type="button" key={id} aria-pressed={filter === id} aria-controls="event-gallery" onClick={() => setFilter(id)}>
            {galleryEventNames[id]} <span>{instagramGalleryPosts.filter((post) => post.event === id).length}</span>
          </button>
        ))}
      </div>
      <div className="gallery-summary">
        <p aria-live="polite" aria-atomic="true">{posts.length} {posts.length === 1 ? "post" : "posts"} / {filter === "all" ? "All events" : galleryEventNames[filter]}{unavailableCount > 0 && ` / ${unavailableCount} unavailable`}</p>
        <p>Open an album. Explore every moment.</p>
      </div>
      <div className="memory-gallery" id="event-gallery">
        {posts.map((post) => <MediaCard key={post.id} post={post} onOpen={(button) => { trigger.current = button; setSelected(post); }} />)}
      </div>
      {selected && <GalleryViewer key={selected.id} post={selected} onClose={closeGallery} />}
    </>
  );
}
