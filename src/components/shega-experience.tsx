"use client";

import { useState } from "react";
import { AboutShegaLogo } from "./about-shega-logo";
import { ShegaLogo } from "./shega-logo";
import { CameraJourney } from "./camera-journey";
import { EventBrief } from "./event-brief";
import { InstagramMoments } from "./instagram-moments";
import { ArrowIcon, InstagramIcon, SparkIcon } from "./icons";
import { INSTAGRAM_URL } from "@/lib/events";

export function ShegaExperience() {
  const [menuOpen, setMenuOpen] = useState(false);

  return <div className="site-wrap shega-journey-site">
    <a className="skip-link" href="#about">Skip the camera journey</a>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Shega Events home"><ShegaLogo /></a>
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close" : "Menu"} <span>{menuOpen ? "−" : "+"}</span></button>
      <nav id="main-nav" className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation" onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
        <a href="#experience" onClick={() => setMenuOpen(false)}>The journey <span>01</span></a>
        <a href="#about" onClick={() => setMenuOpen(false)}>About Shega <span>02</span></a>
        <a href="#moments" onClick={() => setMenuOpen(false)}>The moments <span>03</span></a>
      </nav>
      <a className="header-cta" href="#plan" onClick={() => setMenuOpen(false)}>Plan your event <ArrowIcon diagonal /></a>
    </header>

    <main id="top">
      <CameraJourney />

      <div className="statement-strip" aria-hidden="true">
        <span>GOOD PEOPLE.</span><SparkIcon /><span>BIG IDEAS.</span><SparkIcon /><span>UNFORGETTABLE ENERGY.</span><SparkIcon /><span>THIS IS SHEGA.</span><SparkIcon />
      </div>

      <section className="about-section" id="about" aria-labelledby="about-title">
        <AboutShegaLogo />
        <div className="about-copy">
          <span className="eyebrow"><span className="small-index">02</span> THE PEOPLE BEHIND THE FEELING</span>
          <h2 id="about-title">WE ARE<br /><span className="serif-word">SHEGA!</span></h2>
          <p>Founded in 2019, Shega Events &amp; Promotion has grown into one of the leading event management companies in Addis Ababa, Ethiopia.</p>
          <p>Our team of forward-thinking entrepreneurs brings strong creative vision and strategic execution to every project. We are the generation driving today&apos;s culture, millennials who understand the energy and expectations of the youth that dominate events and festivals.</p>
          <p>We design well-structured, thoughtfully conceptualized, and flawlessly executed experiences. Attention to detail and respect for our clients&apos; priorities define our work, and consistency is a standard, not a goal.</p>
          <a className="text-link about-link" href="#plan">Your moment. Our obsession. <ArrowIcon diagonal /></a>
        </div>
      </section>

      <section className="memory-section section-shell" id="moments" aria-labelledby="memory-title">
        <div className="memory-heading"><span className="eyebrow"><InstagramIcon /> THE STORY DOESN&apos;T END HERE</span><h2 id="memory-title">YOU HAD TO<br /><span className="serif-word">be there.</span></h2><p>Until the next one, step into our world.</p></div>
        <InstagramMoments />
        <a className="button button-outline instagram-button" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><InstagramIcon /> Follow the story <span>@shega_events</span><ArrowIcon diagonal /></a>
      </section>

      <EventBrief />
    </main>

    <footer className="site-footer">
      <div className="footer-top"><a className="brand" href="#top" aria-label="Shega Events, back to top"><ShegaLogo /></a><p>GOOD ENERGY. GREAT PEOPLE. SHEGA EVENTS.</p><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Shega Events on Instagram"><InstagramIcon /><ArrowIcon diagonal /></a></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} SHEGA EVENTS</span><span>MADE FOR THE MOMENTS THAT MATTER.</span><a href="#top">BACK TO TOP ↑</a></div>
      <p className="concept-disclosure">The cinematic scenes are a 3D concept preview, not event footage. Gallery media comes from the linked Instagram posts.</p>
    </footer>
  </div>;
}
