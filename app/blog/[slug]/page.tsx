"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getYouTubeEmbedUrl, type ManagedPost } from "@/lib/blog";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<ManagedPost | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/posts")
      .then((response) => response.ok ? response.json() : [])
      .then((posts: ManagedPost[]) => setPost(posts.find((item) => item.slug === slug) ?? null))
      .catch(() => setPost(null))
      .finally(() => setLoaded(true));
  }, [slug]);

  if (!post) {
    return <main className="blog-page"><header className="blog-header"><Link href="/blog">Back to journal</Link><h1>{loaded ? "Story not found." : "Loading story..."}</h1></header></main>;
  }

  return (
    <main className="blog-page">
      <article className="blog-post">
        <Link href="/blog">Back to journal</Link>
        <p>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "Shega Events"} <span aria-hidden="true">|</span> {post.author}</p>
        <h1>{post.title}</h1>
        {post.image && <div className="blog-post-image" style={{ backgroundImage: `url("${post.image}")` }} />}
        <div className="blog-post-content">
          {post.content.split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
        {Boolean(post.images?.length) && (
          <div className="blog-post-gallery">
            {post.images?.map((image, index) => <img key={`${image.slice(0, 80)}-${index}`} src={image} alt={`${post.title} photo ${index + 1}`} loading="lazy" />)}
          </div>
        )}
        {Boolean(post.youtubeUrls?.length) && (
          <div className="blog-post-videos">
            {post.youtubeUrls?.map((url, index) => {
              const embedUrl = getYouTubeEmbedUrl(url);
              return embedUrl ? <div className="blog-post-video" key={`${url}-${index}`}><iframe src={embedUrl} title={`${post.title} video ${index + 1}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div> : null;
            })}
          </div>
        )}
      </article>
    </main>
  );
}
