"use client";
import { categoryLabels, categoryOrder, categoryTabLabels, type Category } from "@/lib/news/types";
import { Masthead } from "@/components/ui/Masthead";
import { MiniMasthead } from "@/components/ui/MiniMasthead";
import { Bookmark, Magnifier, Shuffle, Sliders, Xmark } from "@/components/ui/icons";

export type Section = "all" | Category | "saved";
export function Header({ date, section, onSection, onSources, onRandom, searchOpen, onSearchOpen, query, onQuery, savedCount }: {
  date: string; section: Section; onSection: (section: Section) => void; onSources: () => void; onRandom: () => void;
  searchOpen: boolean; onSearchOpen: (value: boolean) => void; query: string; onQuery: (value: string) => void; savedCount: number;
}) {
  return <>
    <header className="site-header">
      <div className="utility-row">
        <div><button className="icon-button" aria-label={searchOpen ? "Close search" : "Search stories"} aria-expanded={searchOpen} onClick={() => onSearchOpen(!searchOpen)}>{searchOpen ? <Xmark size={22} /> : <Magnifier size={22} />}</button><div className="edition-date"><strong>{new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" })}</strong></div></div>
        <div className="utility-right"><button onClick={() => onSection("saved")} className="reading-list-button"><Bookmark size={18} />Saved{savedCount > 0 && <span className="saved-count">{savedCount}</span>}</button></div>
      </div>
      <div className="masthead-row">
        <Masthead />
      </div>
    </header>
    <nav className="category-nav" aria-label="Sections">
      <MiniMasthead watch=".masthead-row .masthead" />
      <div className="category-tabs">
        {(["all", ...categoryOrder] as const).map((value) => <button key={value} onClick={() => onSection(value)} aria-current={section === value ? "page" : undefined} className={section === value ? "active" : ""}>{value === "all" ? "All" : categoryTabLabels[value] ?? categoryLabels[value]}</button>)}
        {section === "saved" && <button className="active" aria-current="page" onClick={() => onSection("saved")}>Saved</button>}
      </div>
      <div className="nav-actions">
        <button className="customize-button" onClick={onRandom} title="Open a random story from the past week"><Shuffle size={14} /><span>Random</span></button>
        <button className="customize-button" onClick={onSources} title="Sources and priorities"><Sliders size={14} /><span>Sources</span></button>
      </div>
    </nav>
    {searchOpen && <div className="search-bar"><Magnifier size={18} /><input autoFocus aria-label="Search headlines and descriptions" type="search" placeholder="Search articles" value={query} onChange={(event) => onQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onSearchOpen(false); }} /></div>}
  </>;
}
