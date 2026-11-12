"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { isOptimizable } from "@/lib/news/imageHosts";

type State = "loading" | "loaded" | "error";

/**
 * A gray, shimmering frame that fades the publisher image in once it has decoded.
 * Known publisher hosts go through Next's image optimizer, so a 5,000px original arrives
 * as a right-sized WebP/AVIF for the slot it fills (`sizes`).
 */
export function ShimmerImage({ src, alt, sizes, priority = false, fluid = false, width = 1200, height = 800 }: {
  src: string; alt: string; sizes: string; priority?: boolean; fluid?: boolean; width?: number; height?: number;
}) {
  const [state, setState] = useState<State>("loading");
  // If the optimizer can't reach the publisher in time, fall back to the original file once.
  const [direct, setDirect] = useState(() => !isOptimizable(src));
  // Cached images can finish before hydration, so check once the element is attached.
  const fail = useCallback(() => { if (direct) setState("error"); else setDirect(true); }, [direct]);
  const attach = useCallback((img: HTMLImageElement | null) => {
    if (!img?.complete) return;
    if (img.naturalWidth > 0) setState("loaded"); else fail();
  }, [fail]);
  return <span className={`media-frame${fluid ? " is-fluid" : ""}`} data-state={state}>
    <Image key={direct ? "direct" : "optimized"} ref={attach} src={src} alt={alt} width={width} height={height} sizes={sizes} quality={70}
      unoptimized={direct} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"}
      onLoad={() => setState("loaded")} onError={fail} />
  </span>;
}
