"use client";
import { useEffect, useState } from "react";
import type { Article } from "@/lib/news/types";
import { Bookmark, BookmarkFilled, Check, LinkIcon } from "@/components/ui/icons";
import { useReadingList } from "./useReadingList";

export function StoryActions({ article }: { article: Article }) {
  const saved = useReadingList();
  const isSaved = saved.isSaved(article.id);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try { await navigator.clipboard.writeText(article.url); setCopied(true); }
    catch { window.prompt("Copy the original story link", article.url); }
  }
  return <div className="story-actions">
    {saved.authenticated && <button type="button" onClick={() => saved.toggle(article)} aria-pressed={isSaved}>{isSaved ? <BookmarkFilled size={14} /> : <Bookmark size={14} />}<span>{isSaved ? "Saved" : "Save for later"}</span></button>}
    <button type="button" onClick={copy}>{copied ? <Check size={14} /> : <LinkIcon size={14} />}<span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span></button>
  </div>;
}
