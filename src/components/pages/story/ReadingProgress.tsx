"use client";
import { useArticleProgress } from "./useArticleProgress";
export function ReadingProgress() {
  const progress = useArticleProgress();
  return <span className="reader-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />;
}
