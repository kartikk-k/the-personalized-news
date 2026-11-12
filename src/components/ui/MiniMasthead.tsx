"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * A compact nameplate for sticky bars. It appears as soon as the full masthead (`watch`)
 * scrolls out of view, so the paper's name is always on screen.
 */
export function MiniMasthead({ watch }: { watch: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = document.querySelector(watch);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch]);
  return <Link href="/" className="mini-masthead" data-visible={visible} aria-hidden={!visible} tabIndex={visible ? undefined : -1}>The Modern Times</Link>;
}
