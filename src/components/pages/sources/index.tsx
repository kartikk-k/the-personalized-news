"use client";
import { SiteTopBar } from "@/components/news/SiteTopBar";
import { usePreferences } from "@/components/news/usePreferences";
import type { Preferences } from "@/lib/preferences/schema";
import { Star, StarFilled } from "@/components/ui/icons";
import { categoryLabels, categoryOrder, type Category, type Feed } from "@/lib/news/types";

const statusLabel = (source: Feed["sources"][number]) =>
  source.status === "ok" ? `${source.count} recent` : source.status === "stale" ? "Showing earlier stories" : "Not responding";

export function SourcesPage({ date, owner, sources, initial }: { date: string; owner: boolean; sources: Feed["sources"]; initial: Preferences }) {
  const { hidden, priorities, busy, message, save } = usePreferences(owner, initial);
  const onToggle = (id: string) => { void save({ hidden: hidden.includes(id) ? hidden.filter((item) => item !== id) : [...hidden, id] }); };
  const onTogglePriority = (category: Category) => { void save({ priorities: priorities.includes(category) ? priorities.filter((item) => item !== category) : [...priorities, category] }); };
  return <div className="newspaper-shell"><SiteTopBar date={date} owner={owner} /><main className="settings-page">
      <div className="dialog-top"><h1>Sources &amp; priorities</h1></div>
      <p className="dialog-hint">{owner ? "Your choices sync privately across your devices." : "Your choices are saved in this browser."}</p>
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
    </main></div>;
}
