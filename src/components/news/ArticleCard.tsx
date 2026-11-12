"use client";

import Link from "next/link";
import { categoryLabels, categoryTabLabels, sectionTopics, topicLabels, type Article } from "@/lib/news/types";
import { ShimmerImage } from "@/components/ui/ShimmerImage";
import { Bookmark, BookmarkFilled } from "@/components/ui/icons";
import { useReadingList } from "./useReadingList";

export type CardVariant = "lead" | "row" | "rail" | "pair" | "thumb" | "brief";

/** How wide each placement renders, so the optimizer sends a fitting file. */
const imageSizes: Record<CardVariant | "hero", string> = {
  hero: "(max-width: 720px) 100vw, 680px",
  lead: "(max-width: 1000px) 100vw, 55vw",
  row: "(max-width: 640px) 108px, 240px",
  rail: "(max-width: 860px) 100vw, 380px",
  pair: "(max-width: 860px) 50vw, 180px",
  thumb: "96px",
  brief: "1px",
};

export function ArticleImage({ article, priority = false, caption = true, placement = "hero" }: { article: Article; priority?: boolean; caption?: boolean; placement?: CardVariant | "hero" }) {
  if (!article.image) return null;
  return <figure className="article-image">
    <ShimmerImage key={article.image} src={article.image} alt={article.imageAlt} priority={priority} sizes={imageSizes[placement]} />
    {caption && <figcaption>{article.imageCredit}</figcaption>}
  </figure>;
}

/** Section label, plus the section's own sub-topic when there is one (e.g. "U.S. · Immigration"). */
function kicker(article: Article) {
  const category = article.categories[0];
  const topic = article.topics.find((item) => sectionTopics[category]?.includes(item) && item !== "technology" && item !== "business");
  const label = topic ? categoryTabLabels[category] ?? categoryLabels[category] : categoryLabels[category];
  return topic ? `${label} · ${topicLabels[topic]}` : label;
}

function Meta({ article }: { article: Article }) {
  const saved = useReadingList();
  const isSaved = saved.isSaved(article.id);
  return <div className="article-meta">
    <a href={article.url} target="_blank" rel="noreferrer" className="source-link">{article.source}</a>
    <span className="meta-dot">·</span>
    <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</time>
    {article.fullText && <span className="read-time">{article.readMinutes} min read</span>}
    <button className={`save-button ${isSaved ? "is-saved" : ""}`} aria-label={`${isSaved ? "Remove from saved" : "Save"}: ${article.title}`} aria-pressed={isSaved} onClick={() => saved.toggle(article)}>{isSaved ? <BookmarkFilled size={14} /> : <Bookmark size={14} />}</button>
  </div>;
}

export function ArticleCard({ article, variant = "row", priority = false, also = [] }: { article: Article; variant?: CardVariant; priority?: boolean; also?: Article[] }) {
  const href = `/story/${article.id}`;
  const showDescription = variant === "lead" || variant === "row" || variant === "rail";
  const showImage = variant !== "brief" && article.image;
  return <article className={`article-card article-${variant}${showImage ? "" : " no-image"}`} data-article-id={article.id}>
    <div className="article-copy">
      <div className="eyebrow">{kicker(article)}</div>
      <Link className="story-link" href={href}><h2>{article.title}</h2></Link>
      {showDescription && article.description && <p className="article-description">{article.description}</p>}
      <Meta article={article} />
      {also.length > 0 && <ul className="lead-also">
        {also.map((item) => <li key={item.id}><Link className="story-link" href={`/story/${item.id}`}><h3>{item.title}</h3></Link><span>{item.source}</span></li>)}
      </ul>}
    </div>
    {showImage && <Link href={href} tabIndex={-1} aria-hidden="true" className="story-image-link"><ArticleImage article={article} priority={priority} caption={variant === "lead"} placement={variant} /></Link>}
  </article>;
}
