"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { beatAt, createJourneyStore, journeyAudio, journeyBeats, journeyMedia } from "@/lib/journey";
import { useJourneyProgress } from "@/lib/use-journey-progress";
import { useJourneyAudio } from "@/lib/use-journey-audio";
import { useMediaQuery } from "@/lib/use-media-query";
import dynamic from "next/dynamic";
import { JourneyMedia } from "./journey-media";
import { JourneyStaticStory } from "./journey-static-story";
import { ArrowIcon } from "./icons";

const JourneyScene = dynamic(() => import("./journey/scene").then((module) => module.JourneyScene), {
  ssr: false,
  loading: () => <p className="journey-loading" role="status">Loading the 3D journey...</p>,
});
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
function dataSaving() {
  return "connection" in navigator && typeof navigator.connection === "object" && navigator.connection !== null
    && "saveData" in navigator.connection && navigator.connection.saveData === true;
}
function subscribeConnection(notify: () => void) {
  if (!("connection" in navigator) || !(navigator.connection instanceof EventTarget)) return () => {};
  const connection = navigator.connection;
  connection.addEventListener("change", notify);
  return () => connection.removeEventListener("change", notify);
}

export function CameraJourney() {
  const [store] = useState(createJourneyStore);
  const root = useRef<HTMLElement>(null);
  const progressBar = useRef<HTMLSpanElement>(null);
  const [viewChoice, setViewChoice] = useState<"auto" | "reading" | "camera">("auto");
  const [failure, setFailure] = useState("");
  const [inView, setInView] = useState(true);
  const [sceneResident, setSceneResident] = useState(true);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ready = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const saveData = useSyncExternalStore(subscribeConnection, dataSaving, serverSnapshot);
  const staticMode = viewChoice === "reading" || reducedMotion || Boolean(failure) || (viewChoice === "auto" && saveData);
  const index = useSyncExternalStore(store.subscribe, () => beatAt(store.getSnapshot()), () => 0);
  const beat = journeyBeats[index];
  const onFailure = useCallback((message: string) => {
    console.error(message);
    setFailure(message);
  }, []);
  useJourneyProgress(root, store, !staticMode);
  const audio = useJourneyAudio(store, journeyAudio, inView && !staticMode);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let intersects = false;
    let unloadTimer: ReturnType<typeof setTimeout> | undefined;
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    const updateActivity = () => setInView(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      updateActivity();
      clearTimeout(unloadTimer);
      if (intersects) setSceneResident(true);
      else unloadTimer = setTimeout(() => setSceneResident(false), 5000);
    }, { rootMargin: `-${headerHeight}px 0px 0px 0px` });
    observer.observe(node);
    document.addEventListener("visibilitychange", updateActivity);
    return () => {
      observer.disconnect();
      clearTimeout(unloadTimer);
      document.removeEventListener("visibilitychange", updateActivity);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      if (progressBar.current) progressBar.current.style.transform = `scaleX(${store.getSnapshot()})`;
    };
    update();
    return store.subscribe(update);
  }, [store, staticMode]);

  function changeMode() {
    setViewChoice(staticMode ? "camera" : "reading");
    requestAnimationFrame(() => {
      root.current?.scrollIntoView({ behavior: "instant", block: "start" });
      const label = staticMode ? "Reading view" : "Camera journey";
      Array.from(root.current?.querySelectorAll("button") ?? []).find((button) => button.textContent === label)?.focus({ preventScroll: true });
    });
  }

  const reason = failure || (reducedMotion ? "Reduced motion is on. Every scene is described below."
    : viewChoice === "reading" ? "Reading view selected. Every scene is described below."
      : saveData ? "Data saving is on. The full story is available without loading 3D." : "");

  return <section ref={root} className={`camera-journey ${staticMode ? "is-static" : ""}`} id="experience" aria-labelledby="journey-title" style={{ "--journey-accent": beat.color } as CSSProperties}>
    <h1 id="journey-title" className="visually-hidden">Shega Events. One continuous journey through many worlds.</h1>
    {staticMode ? <div className="journey-stage">
      <div className="journey-toolbar">
        <div className="journey-edition">
          <span className="journey-dot" aria-hidden="true" />
          <div><span>THE SHEGA JOURNEY</span><span className="journey-brand-signature">The Best and Beyond</span></div>
        </div>
        <div className="journey-controls">
          {!reducedMotion && !failure && <button type="button" onClick={changeMode}>Camera journey</button>}
          <a href="#about">Skip <ArrowIcon /></a>
        </div>
      </div>
      <p className="journey-notice" role="status">{reason}</p>
      <JourneyStaticStory />
    </div> : <div className="journey-stage">
      <div className="journey-view">
        {journeyMedia.status === "approved"
          ? <JourneyMedia media={journeyMedia} store={store} onFailure={onFailure} />
          : ready && sceneResident && <JourneyScene store={store} active={inView} onFailure={onFailure} />}
      </div>
      <div className="journey-toolbar">
        <div className="journey-edition">
          <span className="journey-dot" aria-hidden="true" />
          <div><span>THE SHEGA JOURNEY</span><span className="journey-brand-signature">The Best and Beyond</span></div>
        </div>
        <div className="journey-controls">
          <button type="button" onClick={audio.toggle} disabled={!audio.available} aria-pressed={audio.enabled} title={!audio.available ? "Licensed sound is not yet available for this preview." : undefined}>{!audio.available ? "Sound pending" : audio.enabled ? "Mute" : "Sound"}</button>
          <button type="button" onClick={changeMode}>Reading view</button>
          <a href="#about">Skip <ArrowIcon /></a>
        </div>
      </div>
      <div className="journey-caption" key={beat.id}>
        <p className="journey-kicker"><span>{String(index + 1).padStart(2, "0")}</span> {beat.world} — {beat.detail}</p>
        {index === 9
          ? <h2 className="journey-finale-title">One team. Many worlds.<br /><span>Unforgettable experiences.</span></h2>
          : <h2>{beat.title}</h2>}
        <p className="journey-text">{beat.description}</p>
        {index === 9 && <a className="journey-enquire" href="#plan">Make your next moment <ArrowIcon diagonal /></a>}
        {index === 9 && <a className="journey-model-credits" href="/models/scene-models.attribution.json">3D model credits / CC BY 4.0</a>}
      </div>
      <div className="journey-hint">
        <span aria-hidden="true">&darr;</span>
        <span>SCROLL TO MOVE<br />THE CAMERA</span>
      </div>
      <p className="journey-tag"><span>EST. SEPTEMBER 2019</span>CONCEPT PREVIEW / NOT EVENT FOOTAGE</p>
      <div className="journey-progress" aria-hidden="true"><span ref={progressBar} /></div>
      {audio.available && <p className="journey-audio-status" role="status">{audio.status}</p>}
    </div>}
    <noscript>
      <style>{".camera-journey { height: auto; min-height: 0; padding-top: var(--site-header-height); } .camera-journey > .journey-stage { display: none; }"}</style>
      <p className="journey-notice">The camera journey needs JavaScript. Read the full event story below.</p>
      <JourneyStaticStory />
    </noscript>
  </section>;
}
