import Image from "next/image";
import { journeyBeats, type JourneyBeat } from "@/lib/journey";
import { ArrowIcon } from "./icons";
import { ShegaLogo } from "./shega-logo";

function StoryNote({ beat, number }: { beat: JourneyBeat; number: number }) {
  return (
    <li className="story-note">
      <p className="story-note-label"><span>{String(number).padStart(2, "0")}</span> {beat.detail}</p>
      <h3>{beat.title}</h3>
      <p>{beat.description}</p>
    </li>
  );
}

const worlds = [
  { id: "bermel", number: "01", name: "Bermel Fest", element: "Energy" },
  { id: "etfc", number: "02", name: "ETFC", element: "Impact" },
  { id: "harar", number: "03", name: "Harar & Sengaw", element: "Fire" },
] as const;

export function EventJourney() {
  return (
    <section className="event-journey" id="experience" aria-labelledby="journey-title">
      <header className="story-intro">
        <div className="story-intro-image">
          <Image
            src="/media/instagram/DZIF0nbDdTP/01.webp"
            alt="Bermel Fest's outdoor stage, performers and fire effects beneath the night sky"
            fill
            sizes="100vw"
            preload
          />
        </div>
        <div className="story-intro-copy">
          <p className="story-overline">ADDIS ABABA, ETHIOPIA / SINCE 2019</p>
          <p className="story-series">THE ELEMENTS OF SHEGA</p>
          <h1 id="journey-title">WE CREATE<br /><span>WORLDS.</span></h1>
          <p className="story-intro-description">Music. Culture. Adrenaline.<br />Different worlds. The same Shega energy.</p>
          <a className="story-discover" href="#bermel">Discover our worlds <ArrowIcon /></a>
        </div>
        <a className="story-photo-credit" href="https://www.instagram.com/p/DZIF0nbDdTP/" target="_blank" rel="noopener noreferrer">BERMEL FEST / @bermel_fest <ArrowIcon diagonal /></a>
        <span className="story-intro-edition" aria-hidden="true">THE BEST<br />AND BEYOND.</span>
      </header>

      <nav className="story-world-index" aria-label="Event worlds">
        {worlds.map((world) => (
          <a key={world.id} href={`#${world.id}`}>
            <span className="story-index-number">{world.number}</span>
            <span><strong>{world.name}</strong><small>{world.element}</small></span>
            <ArrowIcon diagonal />
          </a>
        ))}
      </nav>

      <section className="story-world story-bermel" id="bermel" aria-labelledby="bermel-title">
        <div className="story-world-heading">
          <div>
            <p className="story-overline">01 / ENERGY</p>
            <h2 id="bermel-title">BERMEL<br /><span>FEST.</span></h2>
            <p className="story-world-tagline">Many sounds.<br />One shared pulse.</p>
            <a className="story-discover" href="#moments">Inside the moments <ArrowIcon diagonal /></a>
          </div>
          <figure className="story-world-art story-performance">
            <Image src="/media/instagram/DYpWL3hjfTF/01.webp" alt="A smiling singer holding a microphone on the Bermel Fest stage" fill sizes="(max-width: 760px) 100vw, 55vw" />
            <figcaption><span>THE SOUND OF THE CITY</span><a href="https://www.instagram.com/p/DYpWL3hjfTF/" target="_blank" rel="noopener noreferrer">@bermel_fest <ArrowIcon diagonal /></a></figcaption>
          </figure>
        </div>
        <ol className="story-notes">
          {journeyBeats.slice(0, 2).map((beat, index) => <StoryNote key={beat.id} beat={beat} number={index + 1} />)}
        </ol>
      </section>

      <section className="story-world story-etfc" id="etfc" aria-labelledby="etfc-title">
        <div className="story-world-heading">
          <div>
            <p className="story-overline">02 / IMPACT</p>
            <h2 id="etfc-title">ETFC.<br /><span>FIGHT NIGHT.</span></h2>
            <p className="story-world-tagline">All heart.<br />Nothing held back.</p>
            <p className="story-disciplines">JIU-JITSU / KICKBOXING / MMA</p>
          </div>
          <figure className="story-world-art story-fight">
            <Image src="/images/journey/etfc.webp" alt="Concept artwork of two MMA fighters in a red-and-blue padded octagonal cage" fill sizes="(max-width: 760px) 100vw, 55vw" />
            <figcaption><span>CHAMPIONSHIP MINDSET</span><a href="/images/journey/etfc.attribution.json">CONCEPT ART / CREDITS <ArrowIcon diagonal /></a></figcaption>
          </figure>
        </div>
        <ol className="story-notes story-notes-three" start={3}>
          {journeyBeats.slice(2, 5).map((beat, index) => <StoryNote key={beat.id} beat={beat} number={index + 3} />)}
        </ol>
      </section>

      <section className="story-world story-harar" id="harar" aria-labelledby="harar-title">
        <div className="story-world-heading">
          <div>
            <p className="story-overline">03 / FIRE</p>
            <h2 id="harar-title">HARAR<br /><span>&amp; SENGAW.</span></h2>
            <p className="story-amharic" lang="am">{"\u1210\u1228\u122d \u12a5\u1293 \u1220\u1295\u130b\u12cd"}</p>
            <p className="story-world-tagline">Rooted in tradition.<br />Shared with everyone.</p>
          </div>
          <figure className="story-world-art story-food">
            <Image src="/images/tere-siga-beef.png" alt="Fresh hanging cuts of beef in an Ethiopian tere siga meat shop" fill sizes="(max-width: 760px) 100vw, 45vw" />
            <div className="story-food-stamp" aria-hidden="true">KURT<br />TIBS<br /><span>CULTURE.</span></div>
            <figcaption><span>FRESH CUTS. COLD HARAR.</span><span>FOOD / MUSIC / COMMUNITY</span></figcaption>
          </figure>
        </div>
        <ol className="story-notes" start={6}>
          {journeyBeats.slice(5, 9).map((beat, index) => <StoryNote key={beat.id} beat={beat} number={index + 6} />)}
        </ol>
      </section>

      <section className="story-finale" aria-labelledby="story-finale-title">
        <div className="story-finale-brand"><ShegaLogo /></div>
        <p className="story-overline">10 / {journeyBeats[9].detail}</p>
        <h2 id="story-finale-title">One team.<br /><span>Many worlds.</span></h2>
        <p className="story-finale-signoff">Unforgettable experiences.</p>
        <p className="story-finale-description">{journeyBeats[9].description}</p>
        <a className="button button-primary" href="#plan">Create your next experience <ArrowIcon diagonal /></a>
      </section>
    </section>
  );
}
