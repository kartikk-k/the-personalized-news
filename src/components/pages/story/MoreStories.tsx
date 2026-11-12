"use client";

import { useReadingList } from "@/components/news/useReadingList";
import { useViewedArticles } from "@/components/news/useViewedArticles";
import { useState } from "react";
import type { Article } from "@/lib/news/types";
import { getFeed } from "@/controllers/client/news/getFeed";
import { EditionLayout, BLOCK_SIZE } from "@/components/pages/home/EditionLayout";
import { ArrowDown } from "@/components/ui/icons";

export function MoreStories({ initialArticles, excludedIds, includeSports }: { initialArticles: Article[]; excludedIds: string[]; includeSports: boolean }) {
  const saved = useReadingList();
  useViewedArticles(saved.syncState === "synced");
  const [articles, setArticles] = useState(initialArticles);
  const [visible, setVisible] = useState(BLOCK_SIZE * 2);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function loadMore() {
    setMessage("");
    if (visible < articles.length) { setVisible((count) => count + BLOCK_SIZE); return; }
    setLoading(true);
    try {
      const feed = await getFeed();
      const known = new Set([...excludedIds, ...articles.map((article) => article.id)]);
      const additions = feed.articles.filter((article) => !known.has(article.id) && (includeSports || !article.topics.includes("sports")));
      setArticles((current) => [...current, ...additions]);
      setVisible((count) => count + BLOCK_SIZE);
      if (!additions.length) setMessage("You’re up to date. No more stories are available in these feeds yet.");
    } catch { setMessage("Couldn’t check for more stories. Please try again."); }
    finally { setLoading(false); }
  }
  const blocks = [];
  for (let index = 0; index < Math.min(visible, articles.length); index += BLOCK_SIZE) {
    blocks.push(<EditionLayout key={index} articles={articles.slice(index, Math.min(index + BLOCK_SIZE, visible))} first={index === 0} priority={false} />);
  }
  return <section className="keep-reading" aria-labelledby="keep-reading-title">
    <div className="keep-reading-heading"><h2 id="keep-reading-title">Keep reading</h2><span>More on these subjects, closest matches first</span></div>
    {blocks}
    <div className="feed-end">
      <button onClick={loadMore} disabled={loading}><ArrowDown size={14} />{loading ? "Checking for stories…" : "Load more"}</button>
      {message && <span role="status">{message}</span>}
    </div>
  </section>;
}
