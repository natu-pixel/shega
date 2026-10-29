"use client";

import { useEffect } from "react";
import { ScrollStory } from "@/components/scroll-story";
import { Brand } from "@/components/brand";
import Navbar from "@/components/Navbar";
import { CONTACT_CHANNELS, CONTACT_EMAIL, SITE_NAME } from "@/lib/site";
import { UpcomingEventCountdown } from "@/components/upcoming-event-countdown";
import { FeaturedEvents } from "@/components/featured-events";
import { BlogPreview } from "@/components/blog-preview";

const stats: readonly { label: string; value: string }[] = [
  { label: "HEADQUARTERS", value: "Addis Ababa" },
  { label: "EVENTS PRODUCED", value: "23+" },
  { label: "FLAGSHIP SERIES", value: "Bermel Fest" },
];

export default function ShegaLandingPage() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".blur-reveal"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("is-pending");
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -4% 0px" });

    targets.forEach((target) => {
      const bounds = target.getBoundingClientRect();
      if (bounds.top >= window.innerHeight || bounds.bottom < 0) target.classList.add("is-pending");
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main className="shega-page">
      <Navbar />
      {/* 1. Hero — the scroll-driven Shega Website Video sequence. */}
      <section id="experience" className="shega-hero-slot" aria-label="Shega Events">
        <ScrollStory />
      </section>

      {/* 2. About */}
      <section id="about" className="shega-about-section">
        <div className="shega-container shega-about-grid">
          <div>
            <h2 className="shega-about-headline blur-reveal">
              AN INDEPENDENT EVENT COMPANY CREATING EXPERIENCES THAT BRING PEOPLE
              TOGETHER, FROM THE FIRST IDEA TO THE FINAL MOMENT.
            </h2>
          </div>

          <div className="shega-about-right">
            <p className="shega-about-bio">
              Shega Events produces live experiences in Addis Ababa &mdash; concerts,
              festivals and brand activations &mdash; from the first idea to the final
              moment. Our work brings audiences, artists and brands together through
              experiences made to stay with you.
            </p>

            <div className="shega-stats-list">
              {stats.map((stat) => (
                <div key={stat.label} className="shega-stat-row">
                  <span className="shega-stat-label">{stat.label}</span>
                  <span className="shega-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="shega-services-section" aria-labelledby="services-title">
        <div className="shega-container">
          <p className="shega-services-kicker">WHAT WE DO</p>
          <div className="shega-services-heading">
            <h2 id="services-title" className="fx-typewriter">Ideas into experiences.</h2>
            <p>From the first brief to the final guest leaving, we bring every moving part together.</p>
          </div>
          <div className="shega-services-grid">
            {[
              ["01", "Event management", "End-to-end planning, production and delivery."],
              ["02", "Event coordination", "Calm, detail-led coordination on the day."],
              ["03", "Experiential marketing", "ATL and BTL experiences that connect brands with people."],
            ].map(([number, title, detail]) => (
              <article className="shega-service-card" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{detail}</p>
              </article>
            ))}
            <a className="shega-service-card shega-service-card-quote" href="#contact">
              <span>04</span><h3>Request a quote</h3><p>Tell us what you’re planning and let’s make it happen.</p>
              <b aria-hidden="true">↗</b>
            </a>
          </div>
        </div>
      </section>

      {/* 3. Allies */}
      <section id="allies" className="shega-allies-section" aria-label="Our allies">
        <div className="shega-container shega-allies-heading">
          <h2>Our Allies</h2>
          <p>Worked with 23+ events across multiple occasions<br />Weddings · Concerts · Festivals · Private Events</p>
        </div>
        <div className="shega-allies-marquee" aria-label="Selected event partners">
          <div className="shega-allies-track">
            {[0, 1].map((copy) => (
              <div className="shega-allies-set" aria-hidden={copy === 1 ? "true" : undefined} key={copy}>
                {[
                  ["Harar Beer", "/brand/partners/harar-beer.svg"],
                  ["M-PESA", "/brand/partners/mpesa.svg"],
                  ["Pepsi", "/brand/partners/pepsi.svg"],
                ].map(([name, src]) => <span className="shega-ally-logo" key={name}><img src={src} alt={copy === 0 ? name : ""} /></span>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <UpcomingEventCountdown />

      {/* 4. Featured Events Gallery */}
      <FeaturedEvents />

      <BlogPreview />

      {/* 5. International Artists */}
      <section id="contact" className="shega-dark-section">
        <div className="shega-container">
          <div className="shega-switcher-header">
            <h2 className="shega-section-title-lg">INTERNATIONAL<br />ARTISTS</h2>
          </div>

          <div className="international-artists-gallery" aria-label="International artists and live performances">
            {[
              ["photo_2026-10-28_20-28-13.jpg", "International artist performance"],
              ["photo_2026-10-28_20-28-16.jpg", "Live artist performance"],
              ["photo_2026-10-28_20-28-18.jpg", "Artist on stage"],
              ["photo_2026-10-28_20-28-22.jpg", "Live music performance"],
              ["photo_2026-10-28_20-28-25.jpg", "Artist and audience"],
              ["photo_2026-10-28_20-28-28.jpg", "International live experience"],
            ].map(([src, alt]) => (
              <img key={src} src={`/international%20artists/${src}`} alt={alt} loading="lazy" />
            ))}
          </div>

          <div className="shega-divider-stage">
            <div className="shega-vertical-line" />
          </div>

          <div className="shega-contact-grid">
            <div className="shega-contact-left">
              <div>
                <div className="shega-eyebrow-light">
                  <span className="shega-orange-dot" />
                  <span>GLOBAL TALENT</span>
                </div>

                <h2 className="shega-contact-title kinetic-type">ARTISTS<br />FROM EVERYWHERE.</h2>

                <p className="shega-contact-subtext">
                  From Addis Ababa to the world &mdash; we bring artists, DJs and performers
                  together for moments that stay with the audience long after the lights go up.
                </p>
              </div>

              <div className="shega-contact-info-list">
                {CONTACT_CHANNELS.map((channel) => (
                  <div className="shega-contact-info-row" key={channel.label}>
                    <span className="shega-contact-label">{channel.label}</span>
                    <a href={channel.href} target={channel.href.startsWith("http") ? "_blank" : undefined} rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined} className="shega-contact-link">
                      {channel.value}
                    </a>
                  </div>
                ))}

                <p className="shega-contact-footnote">
                  BASED IN ADDIS ABABA &middot; PRODUCING ACROSS ETHIOPIA &amp; BEYOND
                </p>
              </div>
            </div>

            <div className="shega-form-card">
              <h3 className="shega-form-heading">PLAN AN EXPERIENCE</h3>
              <p className="shega-contact-subtext">
                Tell us what you are planning. We will get back to you by email.
              </p>
              <form
                className="shega-inquiry-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  const inquiryType = String(values.get("inquiryType") || "Event");
                  const subject = `${inquiryType} inquiry: ${values.get("project") || "New project"}`;
                  const body = [
                    `Inquiry type: ${inquiryType}`,
                    `Event or artist: ${values.get("project") || "Not provided"}`,
                    `Event type: ${values.get("eventType") || "Not provided"}`,
                    `Preferred date: ${values.get("date") || "Not provided"}`,
                    `Location: ${values.get("location") || "Not provided"}`,
                    `Estimated audience: ${values.get("audience") || "Not provided"}`,
                    `Budget range: ${values.get("budget") || "Not provided"}`,
                    `Name: ${values.get("name")}`,
                    `Email: ${values.get("email")}`,
                    "",
                    String(values.get("brief") || ""),
                  ].join("\n");
                  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
              >
                <div className="shega-form-fields">
                  <label>What are you planning?<select name="inquiryType" defaultValue="Event"><option>Event</option><option>Artist booking</option><option>Brand activation</option><option>Private event</option></select></label>
                  <label>Your name<input name="name" autoComplete="name" placeholder="Full name" required /></label>
                  <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
                  <label>Event or artist name<input name="project" placeholder="If known" /></label>
                  <label>Event type<input name="eventType" placeholder="Concert, festival, launch..." /></label>
                  <label>Preferred date<input name="date" type="date" /></label>
                  <label>Location<input name="location" placeholder="City or venue" /></label>
                  <label>Estimated audience<input name="audience" inputMode="numeric" placeholder="Approximate number" /></label>
                  <label>Budget range<input name="budget" placeholder="Optional" /></label>
                  <label className="shega-form-wide">Project details<textarea name="brief" rows={3} placeholder="Goals, requirements, links, or anything we should know" required /></label>
                </div>
                <div className="shega-form-actions">
                  <button className="shega-submit-pill" type="submit">Prepare inquiry email <span aria-hidden="true">↗</span></button>
                  <span className="shega-form-note">Opens your email app. Review and send your message to {CONTACT_EMAIL}.</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="shega-footer">
        <div className="shega-container shega-footer-inner">
          <div className="shega-footer-brand">
            <Brand footer />
            <p className="shega-footer-tagline">{SITE_NAME} &middot; Addis Ababa, Ethiopia</p>
          </div>
          <nav className="shega-footer-links">
            <a href="/privacy" className="shega-footer-link">Privacy Policy</a>
            <a href="/cookies" className="shega-footer-link">Cookies</a>
            <a href="/terms" className="shega-footer-link">Terms of Service</a>
            <a href="#contact" className="shega-footer-link">Contact</a>
          </nav>
          <div className="shega-footer-socials">
            <a href="https://www.instagram.com/shega_events/" className="shega-footer-social" aria-label="Instagram: @shega_events" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle className="social-icon-fill" cx="18" cy="6" r="1" /></svg>
            </a>
            <a href="https://www.tiktok.com/@shega_events" className="shega-footer-social" aria-label="TikTok: @shega_events" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.2a4.2 4.2 0 1 1-3.5-4.14v3.1a1.3 1.3 0 1 0 .6 1.1V3h3c.2 2.1 1.4 3.6 3.9 4v3.1A8 8 0 0 1 14 8.5" /></svg>
            </a>
            <a href="https://www.facebook.com/ShegaEventsandPromotion/" className="shega-footer-social" aria-label="Facebook: Shega Events and Promotion" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.8-.1-1.6-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8z" /></svg>
            </a>
            <a href="https://t.me/shega_events" className="shega-footer-social" aria-label="Telegram: @shega_events" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.5 4.5-3.2 15c-.2 1.1-.8 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 9-8.1c.4-.4-.1-.6-.6-.2L6.1 13.4l-4.7-1.5c-1-.3-1-1 .2-1.5l18.3-7c.9-.3 1.8.2 1.6 1.1Z" /></svg>
            </a>
          </div>
          <p className="shega-footer-year">&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p className="shega-footer-build">Built by <a href="https://daat.tech" target="_blank" rel="noopener noreferrer" className="shega-footer-build-link">daat.tech</a></p>
        </div>
        <div className="shega-footer-marquee" aria-hidden="true">
          <div className="shega-footer-marquee-track">
            {[0, 1].map((copy) => <span key={copy}>SHEGA EVENTS<sup>®</sup>&nbsp;</span>)}
          </div>
        </div>
      </footer>
    </main>
  );
}
