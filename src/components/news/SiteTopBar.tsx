"use client";
import Link from "next/link";
import { Masthead } from "@/components/ui/Masthead";
import { Bookmark, Magnifier, Xmark } from "@/components/ui/icons";
export function SiteTopBar({ date, owner, searchOpen, onSearch }: { date: string; owner: boolean; searchOpen?: boolean; onSearch?: () => void }) {
  return <header className="site-header top-bar">
    <div className="top-bar-left">
      {onSearch ? <button className="icon-button" aria-label={searchOpen ? "Close search" : "Search stories"} aria-expanded={searchOpen} onClick={onSearch}>{searchOpen ? <Xmark size={22} /> : <Magnifier size={22} />}</button> : <Link className="top-text-link" href="/">Today’s paper</Link>}
      <strong className="top-bar-date">{new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" })}</strong>
    </div>
    <div className="masthead-row top-bar-logo"><Masthead /></div>
    <div className="top-bar-right">{owner ? <Link href="/saved" className="reading-list-button"><Bookmark size={18} />Saved</Link> : <Link href="/sign-in" className="top-text-link">Login</Link>}</div>
  </header>;
}
