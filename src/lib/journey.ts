export const journeyBeats = [
  { id: "stage", start: 0, world: "BERMEL FEST", detail: "OPEN-FORMAT MUSIC FESTIVAL", title: "One festival. Every sound.", description: "Shega's flagship open-format music festival brings local and international artists together across more than 23 editions.", color: "#c6acff" },
  { id: "crowd", start: 0.12, world: "BERMEL FEST", detail: "NIGHTLIFE & HIGH ENERGY", title: "The city moves to Bermel.", description: "Afrobeats, Dancehall, EDM and local sounds meet at Kana Warehouse, VillaVerde and Ghion Hotel. Different genres. One shared energy.", color: "#c6acff" },
  { id: "door", start: 0.26, world: "ETFC", detail: "THE CHAMPIONSHIP", title: "Ethiopia's fighting spirit.", description: "Ethiopian Top Fighting Championship puts Ethiopian fighters in the spotlight, creating a dedicated platform for MMA and combat sports.", color: "#fca69b" },
  { id: "fighters", start: 0.32, world: "ETFC", detail: "MIXED MARTIAL ARTS", title: "Skill. Discipline. Impact.", description: "Jiu-Jitsu, kickboxing and martial arts come together as top Ethiopian fighters test their technique, strength and determination.", color: "#fca69b" },
  { id: "exit", start: 0.44, world: "ETFC", detail: "BIG-STAGE PRODUCTION", title: "More than fight night.", description: "From weigh-ins and press conferences to cage fights at Adwa Victory Memorial, every detail builds toward the main event.", color: "#efc88b" },
  { id: "landscape", start: 0.55, world: "HARAR & SENGAW", detail: "ETHIOPIAN MEAT CULTURE", title: "A celebration of siga.", description: "An outdoor celebration of Ethiopian meat culture, from kurt and shekla tibs to smoky barbecue, rooted in food and tradition.", color: "#efc88b" },
  { id: "table", start: 0.65, world: "HARAR & SENGAW", detail: "HARAR BEER PARTNERSHIP", title: "Fresh cuts. Cold Harar.", description: "With Harar Beer as the main beverage sponsor, fresh meat and barbecue meet cold draft beer around one shared table.", color: "#efc88b" },
  { id: "grill", start: 0.74, world: "HARAR & SENGAW", detail: "ACROSS ETHIOPIA", title: "Good food travels.", description: "From Gondar and Dire Dawa to Harar, regional roadshows bring the festival's food, culture and energy to more communities.", color: "#f0a35c" },
  { id: "cheers", start: 0.84, world: "HARAR & SENGAW", detail: "MUSIC, CULTURE & COMMUNITY", title: "Where good company gathers.", description: "Live music, cultural performances and open-air daytime celebrations bring friends together over food, drinks and Ethiopian hospitality.", color: "#efc88b" },
  { id: "ascent", start: 0.92, world: "SHEGA EVENTS", detail: "THE BEST AND BEYOND", title: "One team. Many worlds.", description: "Founded in Addis Ababa in 2019, Shega Events & Promotion turns bold ideas into music festivals, fight nights and cultural gatherings.", color: "#efc88b" },
] as const;

export type JourneyBeat = (typeof journeyBeats)[number];
export function beatAt(progress: number) {
  let index = 0;
  while (index < journeyBeats.length - 1 && progress >= journeyBeats[index + 1].start) index++;
  return index;
}

export type JourneyMedia =
  | { status: "storyboard" }
  | {
    status: "approved";
    fps: number;
    frameCount: number;
    desktop: string;
    mobile: string;
    poster: string;
  };

// Add only frame-aligned, rights-approved renditions of the same continuous master.
export const journeyMedia: JourneyMedia = { status: "storyboard" };

export type JourneyAudioCue = {
  id: string;
  src: string;
  start: number;
  end: number;
  volume: number;
  kind: "ambience" | "accent";
};
export const journeyAudio: readonly JourneyAudioCue[] = [];

export function createJourneyStore() {
  let progress = 0;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => progress,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setProgress: (value: number) => {
      const next = Math.min(1, Math.max(0, value));
      if (next === progress) return;
      progress = next;
      listeners.forEach((listener) => listener());
    },
  };
}
export type JourneyStore = ReturnType<typeof createJourneyStore>;
