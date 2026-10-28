import type { MetadataRoute } from "next";
import { getAdminEnv, seedStaticEvents } from "@/lib/admin";
import { FEATURED_EVENTS } from "@/lib/events";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const env = await getAdminEnv();
    if (env.CONTENT_DB) {
      await seedStaticEvents(env.CONTENT_DB);
      const [events, posts] = await Promise.all([
        env.CONTENT_DB.prepare("SELECT slug, updated_at FROM site_events WHERE published = 1").all<{ slug: string; updated_at: string }>(),
        env.CONTENT_DB.prepare("SELECT slug, updated_at FROM site_posts WHERE published = 1").all<{ slug: string; updated_at: string }>(),
      ]);
      return [
        ...pages,
        ...events.results.map((item) => ({
          url: `${SITE_URL}/events/${item.slug}`,
          lastModified: new Date(item.updated_at),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
        ...posts.results.map((item) => ({
          url: `${SITE_URL}/blog/${item.slug}`,
          lastModified: new Date(item.updated_at),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ];
    }
  } catch {
    // Keep a useful sitemap available when the optional CMS binding is unavailable.
  }

  return [...pages, ...FEATURED_EVENTS.map((event) => ({
    url: `${SITE_URL}/events/${event.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))];
}
