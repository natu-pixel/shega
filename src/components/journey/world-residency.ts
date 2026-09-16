import type { JourneyStore } from "@/lib/journey";

export function worldResidency(progress: number, previous: number) {
  const bermel = progress <= (previous & 1 ? 0.305 : 0.295);
  // The arena mounts only near the hall handoff: through Bermel's curtained
  // doorway the unlit far room reads as the same near-black fog, so an early
  // mount would only add its full crowd cost to every Bermel view.
  const arena = previous & 2
    ? progress >= 0.15 && progress <= 0.66
    : progress >= 0.16 && progress <= 0.65;
  const harar = progress >= (previous & 4 ? 0.45 : 0.46);
  return (bermel ? 1 : 0) | (arena ? 2 : 0) | (harar ? 4 : 0);
}

export function createWorldResidency(store: JourneyStore) {
  let zones = worldResidency(store.getSnapshot(), 0);
  return {
    getSnapshot: () => zones,
    subscribe(notify: () => void) {
      const update = () => {
        const next = worldResidency(store.getSnapshot(), zones);
        if (next === zones) return;
        zones = next;
        notify();
      };
      const unsubscribe = store.subscribe(update);
      update();
      return unsubscribe;
    },
  };
}
