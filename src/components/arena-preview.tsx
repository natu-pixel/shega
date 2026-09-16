"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode, type RefObject } from "react";
import { EventArtwork } from "./event-artwork";
import { useMediaQuery } from "@/lib/use-media-query";
import type { EventKind } from "@/lib/events";

const ArenaScene = dynamic(() => import("./arena-scene"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("The Shega 3D scene could not load. The illustrated experience remains available.", error, info.componentStack);
    this.props.onFailure();
  }
  render() {
    return this.state.failed
      ? <span className="scene-status">Static experience · 3D could not load</span>
      : this.props.children;
  }
}

export function ArenaPreview({ kind, progress }: { kind: EventKind; progress: RefObject<number> }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState("");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    if (container.current) observer.observe(container.current);
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <div ref={container} className={`arena-preview ${ready && !reducedMotion ? "arena-ready" : ""}`} aria-hidden="true">
    <div className="arena-poster"><EventArtwork kind={kind} id="hero-arena" /></div>
    {fallback && <span className="scene-status">{fallback}</span>}
    {!reducedMotion && !fallback && <SceneBoundary onFailure={() => setReady(false)}>
      {(visible || ready) && <div className="arena-canvas">
        <ArenaScene kind={kind} progress={progress} active={visible && pageVisible} onReady={() => setReady(true)} onFallback={(message) => { setReady(false); setFallback(message); }} />
      </div>}
    </SceneBoundary>}
    <div className="arena-vignette" />
  </div>;
}
