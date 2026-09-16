const optimizedModels: Readonly<Record<string, string>> = {
  "/models/guitarist.glb": "/models/lite/guitarist.glb",
  "/fighter.glb": "/models/lite/fighter.glb",
  "/models/acacia-single.glb": "/models/lite/acacia-single.glb",
  "/models/meat.glb": "/models/lite/meat.glb",
  "/models/grill.glb": "/models/lite/grill.glb",
};

export function journeyModelUrl(url: string) {
  return optimizedModels[url] ?? url;
}
