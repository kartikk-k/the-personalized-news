"use client";
import Link from "next/link";
import { useState } from "react";
import { SiteTopBar } from "@/components/news/SiteTopBar";
import { useReadingList, signOutReadingList } from "@/components/news/useReadingList";
import { ArticleCard } from "@/components/news/ArticleCard";
export function SavedPage({ date }: { date: string }) {
  const saved = useReadingList();
  const [visible, setVisible] = useState(30);
  return <div className="newspaper-shell">
    <SiteTopBar date={date} owner={saved.syncState !== "signin"} />
    <main>
      <div className="saved-page-heading"><h1>Saved Articles</h1><button className="top-text-link" onClick={() => { void signOutReadingList().catch(() => window.alert("Could not sign out. Please retry.")); }}>Sign out</button></div>
      <div className="saved-notice" role="status">
        <span>{saved.syncState === "synced" ? "Saved privately across your devices." : saved.syncState === "error" ? "Could not sync your reading list." : saved.syncState === "signin" ? "Your session has ended." : "Loading your saved articles…"}</span>
        {saved.syncState === "error" && <button className="top-text-link" onClick={() => { void saved.retrySync(); }}>Retry</button>}
        {saved.syncState === "signin" && <Link className="top-text-link" href="/sign-in">Login</Link>}
      </div>
      {saved.articles.slice(0, visible).map(article => <ArticleCard key={article.id} article={article} />)}
      {saved.syncState === "synced" && !saved.articles.length && <div className="empty-state"><h2>No saved articles.</h2><p>Use the bookmark beside a story to save it here.</p><Link className="top-text-link" href="/">Today’s paper</Link></div>}
      {visible < saved.articles.length && <div className="feed-end"><button onClick={() => setVisible(count => count + 30)}>Load more</button></div>}
    </main>
  </div>;
}
