// Every company-level value the site renders lives here, so there is exactly one
// place to edit. Nothing below is invented: each value is either a confirmed
// channel or an obvious placeholder to replace.

// No domain purchased yet. Set NEXT_PUBLIC_SITE_URL in the deploy environment.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shega-events.example";

export const SITE_NAME = "Shega Events";
export const SITE_TITLE = "Shega Events — Event Organizer in Addis Ababa, Ethiopia";
export const SITE_DESCRIPTION =
  "Shega Events is an event organizer in Addis Ababa, Ethiopia, producing concerts, festivals, brand activations and live experiences — from Rophnan and Lij Michael shows to city-wide runs.";

export const INSTAGRAM_HANDLE = "@shega_events";
export const INSTAGRAM_URL = "https://www.instagram.com/shega_events/";
export const CONTACT_EMAIL = "info@shega.events";

export const OG_IMAGE = {
  url: "/events/rophnan-finale.jpg",
  width: 1440,
  height: 810,
  alt: "Rophnan concert audience and stage, produced by Shega Events",
};

// Keep verified public contact routes here so the homepage and structured data agree.
export const CONTACT_CHANNELS: readonly { label: string; value: string; href: string }[] = [
  { label: "INSTAGRAM / DM", value: INSTAGRAM_HANDLE, href: INSTAGRAM_URL },
  { label: "EMAIL", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
];
