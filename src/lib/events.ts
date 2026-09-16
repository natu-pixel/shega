export const INSTAGRAM_URL = "https://www.instagram.com/shega_events/";

export const eventWorlds = [
  {
    id: "festival",
    label: "Music festivals",
    shortLabel: "Festivals",
    number: "01",
    color: "#ffb66d",
    description: "Open skies. A shared rhythm. A whole crowd, completely in the moment.",
  },
  {
    id: "concert",
    label: "Concerts",
    shortLabel: "Concerts",
    number: "02",
    color: "#b5a0ff",
    description: "The lights go down. The sound rises. And nothing else matters.",
  },
  {
    id: "fight",
    label: "Fight nights",
    shortLabel: "Fight nights",
    number: "03",
    color: "#ff735f",
    description: "Every entrance. Every round. An atmosphere you can feel.",
  },
  {
    id: "culture",
    label: "Food & culture",
    shortLabel: "Food & culture",
    number: "04",
    color: "#c9db91",
    description: "Good food. Familiar faces. New connections. A reason to come together.",
  },
] as const;

export type EventKind = (typeof eventWorlds)[number]["id"];

export function isEventKind(value: string): value is EventKind {
  return eventWorlds.some((world) => world.id === value);
}

export const projects = [
  {
    id: "bermel",
    name: "BERMEL FEST",
    subtitle: "One rhythm. Thousands of possibilities.",
    category: "MUSIC FESTIVAL",
    kind: "festival",
    detail:
      "Bermel Fest is part of the Shega story shared for this preview. This illustration explores the energy of an open-air music festival. Official event photography, production credits, and the full story will be added once approved.",
  },
  {
    id: "etfc",
    name: "ETFC",
    subtitle: "Grand Fight Night",
    category: "FIGHT NIGHT",
    kind: "fight",
    detail:
      "Shega has been identified as an organizer of ETFC / Grand Fight Night in Ethiopia. This is an original visual concept, not event footage. The official event title, Adwa venue spelling, and production credits are awaiting confirmation.",
  },
  {
    id: "food",
    name: "MORE THAN\nA FESTIVAL.",
    subtitle: "Harer & Sengaw meat festivals",
    category: "FOOD & CULTURE",
    kind: "culture",
    detail:
      "Food, culture, and people belong at the same table. Harer and Sengaw meat festivals are among the events shared for the Shega portfolio. Official spellings, individual event details, credits, and authorized media will be confirmed before publication.",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  subtitle: string;
  category: string;
  kind: EventKind;
  detail: string;
}>;
