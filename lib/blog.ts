export type ManagedPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  images?: string[];
  youtubeUrls?: string[];
  author: string;
  published: boolean;
  publishedAt: string;
  updatedAt?: string;
};

export function validPost(value: unknown): value is ManagedPost {
  if (!value || typeof value !== "object") return false;
  const post = value as Partial<ManagedPost>;
  return typeof post.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)
    && typeof post.title === "string" && post.title.trim().length > 0
    && typeof post.excerpt === "string" && typeof post.content === "string"
    && typeof post.image === "string" && post.image.length <= 2000 && isAllowedBlogImage(post.image) && typeof post.author === "string"
    && (post.images === undefined || (Array.isArray(post.images) && post.images.length <= 30 && post.images.every((image) => typeof image === "string" && image.length <= 2000 && isAllowedBlogImage(image))))
    && (post.youtubeUrls === undefined || (Array.isArray(post.youtubeUrls) && post.youtubeUrls.length <= 10 && post.youtubeUrls.every((url) => typeof url === "string" && getYouTubeEmbedUrl(url) !== null)))
    && typeof post.published === "boolean" && typeof post.publishedAt === "string";
}

function isAllowedBlogImage(value: string) {
  if (value.startsWith("/media/blog/") || value.startsWith("/media/events/") || value.startsWith("/events/")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function getYouTubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "music.youtube.com" && host !== "youtube-nocookie.com") return null;
    const id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export const emptyPost = (): ManagedPost => ({ slug: "", title: "", excerpt: "", content: "", image: "", images: [], youtubeUrls: [], author: "Shega Events", published: false, publishedAt: "" });
