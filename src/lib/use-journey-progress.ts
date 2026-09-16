"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { JourneyStore } from "./journey";

export function useJourneyProgress(root: RefObject<HTMLElement | null>, store: JourneyStore, enabled: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return;
    gsap.registerPlugin(ScrollTrigger);
    let disposed = false;
    const headerHeight = () => document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: () => `top top+=${headerHeight()}`,
      end: "bottom bottom",
      onUpdate: self => { if (!document.hidden) store.setProgress(self.progress); },
      onRefresh: self => store.setProgress(self.progress),
    });
    store.setProgress(trigger.progress);
    const refresh = () => { if (!disposed) trigger.refresh(); };
    const visible = () => {
      if (!document.hidden) {
        trigger.refresh();
        trigger.update();
        store.setProgress(trigger.progress);
      }
    };
    const resize = new ResizeObserver(refresh);
    resize.observe(element);
    document.addEventListener("visibilitychange", visible);
    void document.fonts.ready.then(refresh);
    return () => {
      disposed = true;
      resize.disconnect();
      document.removeEventListener("visibilitychange", visible);
      trigger.kill();
    };
  }, [root, store, enabled]);
}
