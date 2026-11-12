"use client";
import { useEffect, useRef } from "react";
import { Star, StarFilled, Xmark } from "@/components/ui/icons";
import { categoryLabels, categoryOrder, type Category, type Feed } from "@/lib/news/types";

const statusLabel = (source: Feed["sources"][number]) =>
  source.status === "ok" ? `${source.count} recent` : source.status === "stale" ? "Showing earlier stories" : "Not responding";

export function SourcesDialog({ open, onClose, sources, hidden, onToggle, priorities, onTogglePriority, busy = false, message = "" }: {
  busy?: boolean; message?: string;
  open: boolean; onClose: () => void; sources: Feed["sources"]; hidden: string[]; onToggle: (id: string) => void;
  priorities: Category[]; onTogglePriority: (category: Category) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <dialog className="sources-dialog" ref={dialog} aria-labelledby="sources-title" onClose={onClose} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
    <div className="dialog-content">
      <div className="dialog-top"><h2 id="sources-title">Sources &amp; priorities</h2><button aria-label="Close" className="icon-button" onClick={onClose}><Xmark size={18} /></button></div>

      {message && <p role="status" className="dialog-hint">{message}</p>}
      <section className="dialog-section" aria-labelledby="priorities-title">
        <h3 className="dialog-label" id="priorities-title">Prioritize</h3>
        <p className="dialog-hint">Starred sections rise a little more often in your weekly mix. It’s a gentle lean, not a filter.</p>
        <div className="priority-chips">
          {categoryOrder.map((category) => {
            const on = priorities.includes(category);
            return <button disabled={busy} key={category} aria-pressed={on} onClick={() => onTogglePriority(category)}>{on ? <StarFilled size={12} /> : <Star size={12} />}{categoryLabels[category]}</button>;
          })}
        </div>
      </section>

      <section className="dialog-section" aria-labelledby="sources-list-title">
        <h3 className="dialog-label" id="sources-list-title">Sources</h3>
        {categoryOrder.map((category) => {
          const group = sources.filter((source) => source.category === category);
          if (!group.length) return null;
          return <div className="source-group" key={category}>
            <div className="source-group-title">{categoryLabels[category]}</div>
            {group.map((source) => <label className="source-row" key={source.id}>
              <input disabled={busy} type="checkbox" checked={!hidden.includes(source.id)} onChange={() => onToggle(source.id)} />
              <span className="source-name">{source.name}</span>
              <span className={`source-status is-${source.status}`}>{statusLabel(source)}</span>
            </label>)}
          </div>;
        })}
      </section>
      <div className="dialog-footer"><button className="dark-button" onClick={onClose}>Done</button></div>
    </div>
  </dialog>;
}
