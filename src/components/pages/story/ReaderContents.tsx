"use client";

import { useEffect, useMemo, useState } from "react";
import type { Article } from "@/lib/news/types";
import type { OutlineEntry } from "@/lib/news/outline";
import { StoryActions } from "@/components/news/StoryActions";

type Entry = { id: string; label: string; kind: OutlineEntry["kind"] | "edge" };

/** Left rail: a reader-style table of contents that follows your place in the story. */
export function ReaderContents({ article, outline }: { article: Article; outline: OutlineEntry[] }) {
  const entries = useMemo<Entry[]>(() => [
    { id: "overview", label: "Overview", kind: "edge" },
    ...outline,
    { id: "source-notes", label: "Source & credits", kind: "edge" },
  ], [outline]);
  const [active, setActive] = useState("overview");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    function measure() {
      frame = 0;
      const marker = window.innerHeight * 0.3;
      let current = entries[0].id;
      for (const entry of entries) {
        const element = document.getElementById(entry.id);
        if (element && element.getBoundingClientRect().top <= marker) current = entry.id;
      }
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      setActive(atEnd ? entries[entries.length - 1].id : current);
      const body = document.getElementById("story-body")?.getBoundingClientRect();
      if (body && body.height > 0) setProgress(Math.min(1, Math.max(0, (window.innerHeight * 0.6 - body.top) / body.height)));
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(measure); }
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [entries]);

  const left = Math.ceil(article.readMinutes * (1 - progress));
  const status = progress >= 0.99 ? "Finished" : progress <= 0.02 ? `${article.readMinutes} min read` : `${left} min left`;

  return <nav className="contents" aria-label="In this story">
    <div className="rail-heading">In this story</div>
    <ol className="contents-list">
      {entries.map((entry) => <li key={entry.id} data-kind={entry.kind}>
        <a href={`#${entry.id}`} aria-current={active === entry.id ? "location" : undefined}>{entry.label}</a>
      </li>)}
    </ol>
    <div className="contents-progress">
      <span className="progress-track" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></span>
      <span>{status}</span>
    </div>
    <StoryActions article={article} />
  </nav>;
}
