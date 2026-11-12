"use client";
import { useEffect } from "react";

const flushers = new Set<() => Promise<void>>();
export async function flushViewedArticles() { await Promise.allSettled([...flushers].map((flush) => flush())); }

/** Only mounted for the authenticated owner. A brief scroll past is not a view. */
export function useViewedArticles(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const seen = new Set<string>();
    const pending = new Set<string>();
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    let sending = false;
    const flush = async () => {
      if (sending || !pending.size) return;
      sending = true;
      const ids = [...pending].slice(0, 200);
      try {
        const response = await fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }), keepalive: true });
        if (response.ok) for (const id of ids) pending.delete(id);
      } catch { /* Retry this batch while the page remains open. */ }
      finally { sending = false; }
    };
    flushers.add(flush);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.getAttribute("data-article-id");
        const timer = timers.get(entry.target);
        if (timer) clearTimeout(timer);
        timers.delete(entry.target);
        if (!id || seen.has(id) || !entry.isIntersecting || entry.intersectionRatio < .5 || document.hidden) continue;
        timers.set(entry.target, setTimeout(() => {
          timers.delete(entry.target);
          if (document.hidden) return;
          seen.add(id); pending.add(id);
        }, 1500));
      }
    }, { threshold: [.5] });
    const observed = new WeakSet<Element>();
    const scan = () => document.querySelectorAll("[data-article-id]").forEach((node) => { if (!observed.has(node)) { observed.add(node); observer.observe(node); } });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(() => { void flush(); }, 5000);
    const onVisibility = () => {
      if (document.hidden) { for (const timer of timers.values()) clearTimeout(timer); timers.clear(); void flush(); }
      else { observer.disconnect(); document.querySelectorAll("[data-article-id]").forEach((node) => observer.observe(node)); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => { flushers.delete(flush); observer.disconnect(); mutations.disconnect(); clearInterval(interval); for (const timer of timers.values()) clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", flush); void flush(); };
  }, [enabled]);
}
