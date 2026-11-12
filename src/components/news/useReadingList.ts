"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import { articleSchema, type Article } from "@/lib/news/types";
import { readingListMutationSchema, type ReadingListMutation } from "@/lib/reading-list/schema";
import { readingListRequest } from "@/controllers/client/reading-list";

const KEY = "modern-times-reading-list";
const PENDING = "tpt-reading-list-pending";
const MIGRATED = "tpt-owner-list-migrated";
const EVENT = "modern-times-reading-list-change";
type SyncState = "signin" | "local" | "syncing" | "synced" | "error";
let state: SyncState = "local";
let syncing: Promise<void> | null = null;
let started = false;
let lastSync = 0;
const notify = () => window.dispatchEvent(new Event(EVENT));
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}
function snapshot() { try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; } }
function pending() {
  const result = z.array(readingListMutationSchema).safeParse(JSON.parse(localStorage.getItem(PENDING) ?? "[]"));
  return result.success ? result.data : [];
}
function apply(articles: Article[], operation: ReadingListMutation): Article[] {
  if (operation.action === "remove") return articles.filter((article) => article.id !== operation.id);
  if (operation.action === "save") return [operation.article, ...articles.filter((article) => article.id !== operation.article.id)];
  return [...new Map([...operation.articles, ...articles].map((article) => [article.id, article])).values()];
}
async function synchronize() {
  if (syncing) return syncing;
  const work = async () => {
    state = "syncing"; notify();
    try {
      let remote = await readingListRequest();
      if (!remote.authenticated) { state = "signin"; return; }
      if (!remote.cloud) { state = "local"; return; }
      if (!localStorage.getItem(MIGRATED)) {
        const local = z.array(articleSchema).parse(JSON.parse(snapshot()));
        if (local.length) remote = await readingListRequest({ action: "import", articles: local });
        localStorage.setItem(MIGRATED, "1");
      }
      while (pending().length) {
        const operation = pending()[0];
        remote = await readingListRequest(operation);
        // Preserve operations appended while this request was in flight.
        const queue = pending();
        if (JSON.stringify(queue[0]) === JSON.stringify(operation)) queue.shift();
        localStorage.setItem(PENDING, JSON.stringify(queue));
      }
      localStorage.setItem(KEY, JSON.stringify(remote.articles));
      state = "synced"; lastSync = Date.now();
    } catch { state = "error"; }
    finally { notify(); }
  };
  // Web Locks serializes reconciliation across tabs sharing this origin.
  syncing = (async () => {
    if (navigator.locks) await navigator.locks.request("tpt-reading-list-sync", work);
    else await work();
  })().finally(() => { syncing = null; });
  return syncing;
}

export function useReadingList() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const syncState = useSyncExternalStore(subscribe, () => state, () => "local" as SyncState);
  const articles = useMemo(() => {
    try { const result = z.array(articleSchema).safeParse(JSON.parse(raw)); return result.success ? result.data : []; }
    catch { return []; }
  }, [raw]);
  useEffect(() => {
    if (started) return;
    started = true;
    void synchronize();
    // One listener per page, rather than one request/listener per article card.
    window.addEventListener("online", () => { void synchronize(); });
    window.addEventListener("focus", () => { if (Date.now() - lastSync > 60_000) void synchronize(); });
  }, []);
  async function toggle(article: Article) {
    const update = () => {
      const current = z.array(articleSchema).parse(JSON.parse(snapshot()));
      const operation: ReadingListMutation = current.some((item) => item.id === article.id)
        ? { action: "remove", id: article.id } : { action: "save", article };
      localStorage.setItem(PENDING, JSON.stringify([...pending(), operation]));
      localStorage.setItem(KEY, JSON.stringify(apply(current, operation)));
      notify();
    };
    try {
      if (navigator.locks) await navigator.locks.request("tpt-reading-list-sync", update);
      else update();
      await synchronize();
    } catch { window.alert("Your browser could not save this story. Please check that local storage is available."); }
  }
  return { articles, toggle, syncState, retrySync: synchronize, isSaved: (id: string) => articles.some((article) => article.id === id) };
}

export async function signOutReadingList() {
  const response = await fetch("/api/session", { method: "DELETE" });
  if (!response.ok) throw new Error("Could not sign out");
  // Remove the private offline copy on shared devices too.
  for (const key of [KEY, PENDING, MIGRATED]) localStorage.removeItem(key);
  // Reload clears all authenticated module state and server-rendered owner history.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}
