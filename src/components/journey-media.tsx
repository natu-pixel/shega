"use client";

import { useEffect, useRef } from "react";
import type { JourneyMedia as Media, JourneyStore } from "@/lib/journey";

export function JourneyMedia({ media, store, onFailure }: {
  media: Extract<Media, { status: "approved" }>;
  store: JourneyStore;
  onFailure: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let disposed = false, failed = false, visible = true, frame = 0;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const fail = (message: string) => {
      if (disposed || failed) return;
      failed = true;
      clearTimeout(watchdog);
      element.pause();
      console.error(message, element.error);
      onFailure(message);
    };
    if (!Number.isFinite(media.fps) || media.fps <= 0 || !Number.isInteger(media.frameCount) || media.frameCount < 2) {
      fail("The approved camera master has invalid frame metadata. Showing the static story.");
      return;
    }
    const watch = (message: string) => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (!document.hidden && visible) fail(message);
      }, 15000);
    };
    const seek = () => {
      frame = 0;
      if (failed || disposed || document.hidden || !visible || element.readyState < 1 || element.seeking) return;
      if (!Number.isFinite(element.duration) || element.duration <= 0) {
        fail("The camera master has no usable duration. Showing the static story.");
        return;
      }
      const expectedDuration = media.frameCount / media.fps;
      if (Math.abs(element.duration - expectedDuration) > 2 / media.fps) {
        fail("The camera master duration does not match its frame manifest. Showing the static story.");
        return;
      }
      const targetFrame = Math.round(store.getSnapshot() * (media.frameCount - 1));
      const targetTime = Math.min(targetFrame / media.fps, Math.max(0, element.duration - 1 / media.fps));
      element.dataset.targetFrame = String(targetFrame);
      if (Math.abs(element.currentTime - targetTime) < .25 / media.fps) return;
      watch("The camera footage could not seek on this device. Showing the static story.");
      element.currentTime = targetTime;
    };
    const schedule = () => { if (!frame && !failed) frame = requestAnimationFrame(seek); };
    const settled = () => {
      clearTimeout(watchdog);
      element.dataset.ready = "true";
      element.dataset.settledTime = String(element.currentTime);
      schedule();
    };
    const loaded = () => { clearTimeout(watchdog); schedule(); };
    const error = () => fail("The camera footage could not load. Showing the static story.");
    const pauseUnexpectedPlayback = () => element.pause();
    const visibility = () => {
      element.pause();
      if (document.hidden) clearTimeout(watchdog);
      else { if (element.readyState < 2) watch("The camera footage is unavailable. Showing the static story."); schedule(); }
    };
    element.addEventListener("loadedmetadata", loaded);
    element.addEventListener("loadeddata", settled);
    element.addEventListener("seeked", settled);
    element.addEventListener("error", error);
    element.addEventListener("play", pauseUnexpectedPlayback);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) visibility();
      else clearTimeout(watchdog);
    });
    observer.observe(element);
    const unsubscribe = store.subscribe(schedule);
    element.src = window.matchMedia("(max-width: 760px)").matches ? media.mobile : media.desktop;
    element.load();
    watch("The camera footage is taking too long to load. Showing the static story.");
    return () => {
      disposed = true;
      unsubscribe(); observer.disconnect();
      cancelAnimationFrame(frame); clearTimeout(watchdog);
      document.removeEventListener("visibilitychange", visibility);
      element.removeEventListener("loadedmetadata", loaded);
      element.removeEventListener("loadeddata", settled);
      element.removeEventListener("seeked", settled);
      element.removeEventListener("error", error);
      element.removeEventListener("play", pauseUnexpectedPlayback);
      element.pause(); element.removeAttribute("src"); element.load();
    };
  }, [media, store, onFailure]);

  return <video ref={video} className="journey-film" muted playsInline preload="metadata" poster={media.poster} aria-hidden="true" disablePictureInPicture />;
}
