"use client";

import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import { articleSchema, type Article } from "@/lib/news/types";

const KEY = "modern-times-reading-list";
const EVENT = "modern-times-reading-list-change";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}
function snapshot() { try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; } }

export function useReadingList() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const articles = useMemo(() => {
    try { const result = z.array(articleSchema).safeParse(JSON.parse(raw)); return result.success ? result.data : []; }
    catch { return []; }
  }, [raw]);
  function toggle(article: Article) {
    try {
      const parsed = z.array(articleSchema).safeParse(JSON.parse(snapshot()));
      const current = parsed.success ? parsed.data : [];
      const next = current.some((item) => item.id === article.id) ? current.filter((item) => item.id !== article.id) : [article, ...current];
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    } catch { window.alert("Your browser could not save this story. Please check that local storage is available."); }
  }
  return { articles, toggle, isSaved: (id: string) => articles.some((article) => article.id === id) };
}
