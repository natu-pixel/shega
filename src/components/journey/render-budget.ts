export const MAX_RENDER_PIXELS = 1920 * 1080;

export function scenePixelRatio(width: number, height: number, deviceRatio: number) {
  if (![width, height, deviceRatio].every(Number.isFinite) || width < 0 || height < 0 || deviceRatio <= 0) {
    throw new Error("Scene rendering needs finite dimensions and a positive pixel ratio.");
  }
  return Math.min(deviceRatio, 1.5, Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, width * height)));
}
