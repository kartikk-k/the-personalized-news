import { ViewTransition } from "react";
import Link from "next/link";

/**
 * The nameplate keeps one view-transition identity across the loading screen, the edition and
 * the reader, so it glides into place instead of blinking between pages.
 * Only one named masthead may be on screen at a time; footers use plain text.
 */
export function Masthead({ className = "" }: { className?: string }) {
  return <ViewTransition name="masthead" share="masthead-morph" default="none">
    <Link className={`masthead ${className}`} href="/" aria-label="The Modern Times — today’s edition">The Modern Times</Link>
  </ViewTransition>;
}

export function MastheadLoading() {
  return <ViewTransition name="masthead" share="masthead-morph" default="none">
    <span className="masthead">The Modern Times</span>
  </ViewTransition>;
}
