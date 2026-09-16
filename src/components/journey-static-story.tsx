import { journeyBeats } from "@/lib/journey";
import { ArrowIcon } from "./icons";

export function JourneyStaticStory() {
  return <div className="journey-static">
    <ol className="journey-static-list">
      {journeyBeats.map((beat, index) => <li key={beat.id} style={{ borderLeftColor: beat.color }}>
        <p className="eyebrow">{String(index + 1).padStart(2, "0")} / {beat.world} — {beat.detail}</p>
        <h3>{beat.title}</h3>
        <p>{beat.description}</p>
      </li>)}
    </ol>
    <div className="journey-static-finale">
      <p className="eyebrow">SHEGA EVENTS / EST. SEPTEMBER 2019</p>
      <h2>One team.<br />Many worlds.<br /><span>Unforgettable experiences.</span></h2>
      <p className="journey-brand-values">The Best and Beyond. Attention to every detail. Cultural integrity at the heart of every gathering.</p>
      <a className="button button-primary" href="#plan">Create your next experience <ArrowIcon diagonal /></a>
      <p><a className="journey-model-credits" href="/models/scene-models.attribution.json">3D model credits / CC BY 4.0</a></p>
    </div>
  </div>;
}
