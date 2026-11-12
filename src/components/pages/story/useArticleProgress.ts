"use client";
import { useEffect, useState } from "react";

export function useArticleProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const article = document.querySelector(".reader-article");
    if (!article) return;
    const measure = () => {
      frame = 0;
      const rect = article.getBoundingClientRect();
      const toolbar = document.querySelector(".reader-toolbar")?.getBoundingClientRect().height ?? 0;
      const top = rect.top + window.scrollY;
      const start = Math.max(0, top - toolbar);
      // Finish when the bottom of the article enters the viewport, before related reading.
      const end = top + rect.height - window.innerHeight;
      setProgress(end <= start ? (rect.bottom <= window.innerHeight ? 1 : 0) : Math.max(0, Math.min(1, (window.scrollY - start) / (end - start))));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    resize.observe(article);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { resize.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);
  return progress;
}
