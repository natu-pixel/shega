"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JourneyAudioCue, JourneyStore } from "./journey";

type Track = { cue: JourneyAudioCue; audio: HTMLAudioElement };
type Flags = { fired: Set<string>; starting: Set<string> };

function applyCue(track: Track, position: number, from: number, flags: Flags, isLive: () => boolean, onError: (message: string, error?: unknown) => void) {
  const { cue, audio } = track;
  const inside = position >= cue.start && position < cue.end;
  if (position < cue.start - .02) flags.fired.delete(cue.id);
  let shouldPlay = false;
  if (cue.kind === "ambience") {
    const fade = Math.min(.03, (cue.end - cue.start) / 3);
    const envelope = Math.max(0, Math.min(1, (position - cue.start) / fade, (cue.end - position) / fade));
    audio.volume = Math.min(.6, Math.max(0, cue.volume)) * envelope;
    shouldPlay = inside && audio.volume > .001;
  } else {
    audio.volume = Math.min(.6, Math.max(0, cue.volume));
    if (inside && from < cue.start && !flags.fired.has(cue.id)) {
      audio.currentTime = 0;
      flags.fired.add(cue.id);
      shouldPlay = true;
    } else shouldPlay = inside && !audio.paused;
  }
  if (!shouldPlay) { audio.pause(); return; }
  if (!audio.paused || flags.starting.has(cue.id)) return;
  flags.starting.add(cue.id);
  void audio.play().then(() => {
    flags.starting.delete(cue.id);
    if (!isLive()) audio.pause();
  }, error => {
    flags.starting.delete(cue.id);
    if (error instanceof DOMException && error.name === "AbortError") return;
    onError("Sound playback was blocked or failed.", error);
  });
}

export function useJourneyAudio(store: JourneyStore, cues: readonly JourneyAudioCue[], active: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState(cues.length ? "Sound is off." : "Licensed sound is not available yet.");
  const tracks = useRef<Track[]>([]);
  const flags = useRef<Flags>({ fired: new Set(), starting: new Set() });
  const consent = useRef(false);
  const allowed = useRef(false);
  const mounted = useRef(false);
  const previous = useRef(store.getSnapshot());

  const stop = useCallback(() => {
    tracks.current.forEach(track => track.audio.pause());
  }, []);
  const fail = useCallback((message: string, error?: unknown) => {
    console.error(message, error);
    consent.current = false;
    stop();
    if (mounted.current) { setEnabled(false); setStatus(`${message} You can enable sound to retry.`); }
  }, [stop]);

  const update = useCallback(() => {
    const position = store.getSnapshot();
    const from = previous.current;
    previous.current = position;
    if (!consent.current || !allowed.current || document.hidden) { stop(); return; }
    const isLive = () => consent.current && allowed.current && !document.hidden;
    const onError = (message: string, error?: unknown) => { if (mounted.current) fail(message, error); };
    for (const track of tracks.current) applyCue(track, position, from, flags.current, isLive, onError);
  }, [store, stop, fail]);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = store.subscribe(update);
    document.addEventListener("visibilitychange", update);
    return () => {
      mounted.current = false; consent.current = false;
      unsubscribe(); document.removeEventListener("visibilitychange", update);
      tracks.current.forEach(({ audio }) => { audio.onerror = null; audio.pause(); audio.removeAttribute("src"); audio.load(); });
      tracks.current = [];
    };
  }, [store, update]);

  useEffect(() => {
    allowed.current = active;
    update();
  }, [active, update]);

  const toggle = useCallback(() => {
    if (!cues.length) { setStatus("Licensed sound is not available yet."); return; }
    if (consent.current) {
      consent.current = false; stop(); setEnabled(false); setStatus("Sound is off.");
      return;
    }
    if (!tracks.current.length) {
      const invalid = cues.some(cue => !cue.src || !Number.isFinite(cue.volume) || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end > 1 || cue.start >= cue.end);
      if (invalid) { fail("The sound cue configuration is invalid."); return; }
      // Media objects and requests exist only after this explicit user gesture.
      tracks.current = cues.map(cue => {
        const audio = new Audio();
        audio.loop = cue.kind === "ambience";
        audio.preload = "none";
        audio.onerror = () => fail("A licensed sound file could not load.", audio.error);
        audio.src = cue.src;
        return { cue, audio };
      });
    } else {
      tracks.current.forEach(({ audio }) => { if (audio.error) audio.load(); });
    }
    consent.current = true;
    previous.current = store.getSnapshot();
    setEnabled(true); setStatus("Sound enabled. Atmosphere follows your position in the journey.");
    update();
  }, [cues, fail, stop, store, update]);

  return { status, enabled, available: cues.length > 0, toggle };
}
