"use client";

import { useRef } from "react";
import type { OutlineEntry } from "@/lib/news/outline";
import { ChevronDown } from "@/components/ui/icons";

/** Native disclosure keeps the article outline available in the sticky mobile bar. */
export function MobileContents({ outline }: { outline: OutlineEntry[] }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  return <details className="mobile-contents" ref={disclosure} onKeyDown={(event) => {
    if (event.key === "Escape" && disclosure.current?.open) {
      disclosure.current.open = false;
      disclosure.current.querySelector("summary")?.focus();
    }
  }}>
    <summary aria-label="Table of contents" title="Table of contents"><span>Contents</span><ChevronDown size={18} /></summary>
    <nav aria-label="Table of contents" className="mobile-contents-panel">
      <strong>In this story</strong>
      <ol>
        {[{ id: "overview", label: "Overview" }, ...outline, { id: "source-notes", label: "Source & credits" }].map((entry) => <li key={entry.id}>
          <a href={`#${entry.id}`} onClick={() => {
            if (disclosure.current) disclosure.current.open = false;
          }}>{entry.label}</a>
        </li>)}
      </ol>
    </nav>
  </details>;
}
