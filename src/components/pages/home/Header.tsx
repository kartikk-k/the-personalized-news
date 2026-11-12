"use client";
import { categoryLabels, categoryOrder, categoryTabLabels, type Category } from "@/lib/news/types";
import { SiteTopBar } from "@/components/news/SiteTopBar";
import { MiniMasthead } from "@/components/ui/MiniMasthead";
import { Magnifier, Shuffle, Sliders } from "@/components/ui/icons";

export type Section = "all" | Category;
export function Header({ date, section, onSection, onSources, onRandom, searchOpen, onSearchOpen, query, onQuery, owner }: {
  date: string; section: Section; onSection: (section: Section) => void; onSources: () => void; onRandom: () => void;
  searchOpen: boolean; onSearchOpen: (value: boolean) => void; query: string; onQuery: (value: string) => void; owner: boolean;
}) {
  return <>
    <SiteTopBar date={date} owner={owner} searchOpen={searchOpen} onSearch={() => onSearchOpen(!searchOpen)} />
    <nav className="category-nav" aria-label="Sections">
      <MiniMasthead watch=".masthead-row .masthead" />
      <div className="category-tabs">
        {(["all", ...categoryOrder] as const).map((value) => <button key={value} onClick={() => onSection(value)} aria-current={section === value ? "page" : undefined} className={section === value ? "active" : ""}>{value === "all" ? "All" : categoryTabLabels[value] ?? categoryLabels[value]}</button>)}
      </div>
      <div className="nav-actions">
        <button className="customize-button" onClick={onRandom} title="Open a random story from the past week"><Shuffle size={14} /><span>Random</span></button>
        <button className="customize-button" onClick={onSources} title="Sources and priorities"><Sliders size={14} /><span>Sources</span></button>
      </div>
    </nav>
    {searchOpen && <div className="search-bar"><Magnifier size={18} /><input autoFocus aria-label="Search headlines and descriptions" type="search" placeholder="Search articles" value={query} onChange={(event) => onQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onSearchOpen(false); }} /></div>}
  </>;
}
