export const galleryEventIds = ["bermel", "kemn-ljemr", "hello-hawassa"] as const;
export type GalleryEventId = (typeof galleryEventIds)[number];

export const galleryEventNames: Record<GalleryEventId, string> = {
  bermel: "Bermel Fest",
  "kemn-ljemr": "Kemn Ljemr - Album Release",
  "hello-hawassa": "Hello Hawassa",
};

type MediaDetails = { src: string; width: number; height: number; alt: string };
export type InstagramGalleryMedia =
  | (MediaDetails & { type: "image" })
  | (MediaDetails & { type: "video"; poster: string });

export type InstagramGalleryPost = {
  id: string;
  url: string;
  event: GalleryEventId;
  credit: string;
  media: readonly InstagramGalleryMedia[];
};

export function galleryMediaSummary(media: readonly InstagramGalleryMedia[]) {
  const photos = media.filter((item) => item.type === "image").length;
  const videos = media.length - photos;
  return [
    photos ? `${photos} ${photos === 1 ? "photo" : "photos"}` : "",
    videos ? `${videos} ${videos === 1 ? "video" : "videos"}` : "",
  ].filter(Boolean).join(" / ");
}
