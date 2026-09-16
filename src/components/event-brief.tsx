"use client";

import { useRef, useState, type FormEvent } from "react";
import { eventWorlds, INSTAGRAM_URL, isEventKind } from "@/lib/events";
import { ArrowIcon, InstagramIcon, SparkIcon } from "./icons";

export function EventBrief() {
  const [brief, setBrief] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState("");
  const result = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);

  function createBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const kind = String(data.get("kind") ?? "");
    const idea = String(data.get("idea") ?? "").trim();
    if (!name || idea.length < 10 || !isEventKind(kind)) {
      setError("Please add your name, choose an event type, and describe your idea in at least 10 characters.");
      return;
    }
    const world = eventWorlds.find((item) => item.id === kind)!;
    const date = String(data.get("date") ?? "");
    const location = String(data.get("location") ?? "").trim();
    setBrief([
      "Hi Shega! Let's create something unforgettable.",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Event: ${world.label}`,
      ...(date ? [`Preferred date: ${date}`] : []),
      ...(location ? [`Location: ${location}`] : []),
      "",
      idea,
    ].join("\n"));
    setError("");
    setCopyStatus("");
    requestAnimationFrame(() => result.current?.focus());
  }

  async function copyBrief() {
    if (!navigator.clipboard) {
      text.current?.focus();
      text.current?.select();
      setCopyStatus("Clipboard access is unavailable. Select and copy the brief below, then send it on Instagram.");
      return;
    }
    try {
      await navigator.clipboard.writeText(brief);
      setCopyStatus("Brief copied. Open Instagram and send it to @shega_events. Nothing has been sent yet.");
    } catch (error) {
      console.error("Could not copy the event brief to the clipboard.", error);
      text.current?.focus();
      text.current?.select();
      setCopyStatus("Your browser blocked clipboard access. Copy the selected text manually, then send it on Instagram.");
    }
  }

  return <section className="plan-section section-shell" id="plan" aria-labelledby="plan-title">
    <div className="plan-intro">
      <span className="eyebrow"><span className="status-dot" /> MAKE THE FIRST MOVE</span>
      <h2 id="plan-title">YOUR NEXT<br />BIG MOMENT<br /><span className="serif-word">starts here.</span></h2>
      <p>One idea is all it takes.<br />Tell us what you have in mind.</p>
      <a className="text-link" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><InstagramIcon /> Or say hello on Instagram <ArrowIcon diagonal /></a>
      <SparkIcon className="plan-spark" />
    </div>
    <div className="brief-panel">
      <div className="brief-header"><span className="eyebrow">YOUR EVENT BRIEF</span><span>01 / THE BEGINNING</span></div>
      <p className="brief-notice">Build a brief, then send it to us on Instagram. This preview does not submit or store your details.</p>
      <form onSubmit={createBrief}>
        <div className="field-row">
          <label>Your name <span aria-hidden="true">*</span><input name="name" autoComplete="name" placeholder="How should we call you?" required maxLength={100} /></label>
          <label>Email address <span aria-hidden="true">*</span><input type="email" name="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>
        </div>
        <label>What are we creating? <span aria-hidden="true">*</span>
          <select name="kind" defaultValue="" required>
            <option value="" disabled>Choose your kind of energy</option>
            {eventWorlds.map((world) => <option key={world.id} value={world.id}>{world.label}</option>)}
          </select>
        </label>
        <div className="field-row">
          <label>Preferred date <span className="optional">optional</span><input type="date" name="date" /></label>
          <label>Location <span className="optional">optional</span><input name="location" placeholder="A city, a venue, a possibility..." maxLength={160} /></label>
        </div>
        <label>The big idea <span aria-hidden="true">*</span><textarea name="idea" placeholder="The feeling, the crowd, the dream. We’re listening." required minLength={10} maxLength={3000} rows={3} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary brief-submit" type="submit">Create my event brief <ArrowIcon /></button>
        <p className="form-footnote">No commitment. Just the start of something good.</p>
      </form>
      {brief && <div className="brief-result" ref={result} tabIndex={-1}>
        <h3>Your idea, ready to share.</h3>
        <p>Copy this brief and send it to @shega_events. It has not been submitted.</p>
        <textarea ref={text} aria-label="Your prepared event brief" value={brief} readOnly rows={8} />
        <div className="brief-actions">
          <button className="button button-primary" type="button" onClick={copyBrief}>Copy brief <ArrowIcon /></button>
          <a className="button button-outline" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Open Instagram <ArrowIcon diagonal /></a>
        </div>
        <p className="copy-status" role="status">{copyStatus}</p>
      </div>}
    </div>
  </section>;
}
