"use client";

import { useEffect, useState } from "react";

const slides = [
  { src: "/events/0094.webp", alt: "Bermel Fest performer beneath the festival title" },
  { src: "/events/0281.webp", alt: "A dancer performing at Bermel Fest" },
  { src: "/events/0332.webp", alt: "Bermel Fest crowd enjoying the show" },
  { src: "/events/0396.webp", alt: "A packed Bermel Fest audience" },
  { src: "/events/0405.webp", alt: "A performer on the Bermel Fest stage" },
  { src: "/events/0499.webp", alt: "Friends celebrating together at Bermel Fest" },
  { src: "/events/0251.webp", alt: "A live performance at Bermel Fest" },
];

export function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  const show = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <div className="shega-hero-slider" aria-roledescription="carousel" aria-label="Shega Events experiences">
      <div className="shega-hero-images" aria-live="off">
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            className={`shega-hero-image${index === active ? " is-active" : ""}`}
            src={slide.src}
            alt={index === active ? slide.alt : ""}
            aria-hidden={index !== active}
            fetchPriority={index === 0 ? "high" : "auto"}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}
      </div>
      <div className="shega-hero-shade" aria-hidden="true" />
      <div className="shega-hero-topline">
        <div className="shega-hero-controls" aria-label="Choose hero image">
          <button type="button" onClick={() => show(active - 1)} aria-label="Previous image">←</button>
          <span>{String(active + 1).padStart(2, "0")} <i>/</i> {String(slides.length).padStart(2, "0")}</span>
          <button type="button" onClick={() => show(active + 1)} aria-label="Next image">→</button>
        </div>
      </div>
      <div className="shega-hero-wordmark">
        <span>©{new Date().getFullYear()}</span>
        <h1>SHEGA EVENTS<sup>®</sup></h1>
      </div>
      <div className="shega-hero-progress" aria-hidden="true"><span key={active} /></div>
    </div>
  );
}
