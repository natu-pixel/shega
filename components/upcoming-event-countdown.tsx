"use client";

import { useEffect, useState } from "react";
import { getLocalPreviewEvents } from "@/lib/admin-preview";
import type { ManagedEvent } from "@/lib/admin";

type Countdown = { days: number; hours: number; minutes: number; seconds: number };

function getCountdown(date: string, now: number): Countdown | null {
  const target = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(target)) return null;
  const remaining = Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function dateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

export function UpcomingEventCountdown() {
  const [event, setEvent] = useState<ManagedEvent | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const preview = getLocalPreviewEvents();
    const load = preview
      ? Promise.resolve(preview.filter((item) => item.published))
      : fetch("/api/events", { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<ManagedEvent[]> : []);
    load.then((events) => {
      const current = events.filter((item) => item.status === "current" && item.published && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const next = events.filter((item) => item.status === "upcoming" && item.published && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const featured = current ?? next;
      if (featured) setEvent(featured);
    }).catch(() => undefined);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!event) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [event]);

  if (now === null) return null;
  if (!event) {
    return (
      <section id="upcoming" className="upcoming-countdown-section upcoming-countdown-empty" aria-label="Upcoming events">
        <div>
          <span className="upcoming-countdown-kicker"><i /> WHAT'S NEXT</span>
          <h2>New experiences are on the way.</h2>
          <p>Follow Shega Events for announcements and upcoming dates.</p>
          <a href="https://www.instagram.com/shega_events/" target="_blank" rel="noopener noreferrer">Follow @shega_events <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    );
  }
  const countdown = getCountdown(event.date, now);
  if (!countdown && event.status !== "current") return null;

  return (
    <section id="upcoming" className="upcoming-countdown-section" aria-label={event.status === "current" ? "Current featured event" : "Upcoming event countdown"}>
      <div className="upcoming-countdown-card" style={{ backgroundImage: `linear-gradient(90deg, rgba(4, 8, 8, .9) 0%, rgba(4, 8, 8, .72) 48%, rgba(4, 8, 8, .38) 100%), url("${event.image}")` }}>
        <div className="upcoming-countdown-copy">
          <span className="upcoming-countdown-kicker"><i /> {event.status === "current" ? "CURRENTLY FEATURED" : "COMING UP NEXT"}</span>
          <h2>{event.title}</h2>
          <p>{[event.detail, event.location].filter(Boolean).join(" · ")}</p>
          <time dateTime={event.date}>{dateLabel(event.date)}</time>
          <a href={`/events/${event.slug}`}>Event details <span aria-hidden="true">↗</span></a>
        </div>
        {event.status === "upcoming" && countdown && (
          <div className="upcoming-countdown-clock" aria-label={`${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes until ${event.title}`}>
            {([ ["Days", countdown.days], ["Hours", countdown.hours], ["Minutes", countdown.minutes], ["Seconds", countdown.seconds] ] as const).map(([label, value]) => (
              <div className="upcoming-countdown-unit" key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
