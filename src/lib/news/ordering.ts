import { categorySchema, type Article, type Category } from "./types";

export type EditionMode = "latest" | "mix";
export const VISITED_COOKIE = "mt-visited";
export const PRIORITY_COOKIE = "mt-priorities";
/** Out of the box the paper leans a little toward these sections. */
export const DEFAULT_PRIORITIES: Category[] = ["technology", "cybersecurity", "biotech", "science"];
/** A gentle lean, not a filter: a prioritized story is ~1.5× as likely to rise. */
const PRIORITY_WEIGHT = 1.5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function parsePriorities(value: string | undefined | null): Category[] {
  if (value == null) return DEFAULT_PRIORITIES;
  return value.split(",").map((item) => categorySchema.safeParse(item)).flatMap((result) => result.success ? [result.data] : []);
}

/** Small deterministic PRNG so the server render and the hydrated client agree on the order. */
function unitHash(seed: number, id: string) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h + 1) / 4294967297; // (0, 1)
}

const newestFirst = (a: Article, b: Article) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id);

/**
 * "latest": strictly newest first (the first visit of the day).
 * "mix": every story from the past week is reshuffled on each visit, weighted a little toward
 * prioritized sections and fresher stories; anything older follows, newest first.
 */
export function orderEdition(articles: Article[], { mode, seed, priorities, now, boost }: { mode: EditionMode; seed: number; priorities: Category[]; now: string; boost?: (article: Article) => number }) {
  if (mode === "latest") return [...articles].sort(newestFirst);
  const reference = new Date(now).getTime();
  const week: { article: Article; key: number }[] = [];
  const older: Article[] = [];
  for (const article of articles) {
    const age = reference - new Date(article.publishedAt).getTime();
    if (age > WEEK_MS) { older.push(article); continue; }
    const priority = article.categories.some((category) => priorities.includes(category)) ? PRIORITY_WEIGHT : 1;
    const freshness = 0.7 + 0.3 * (1 - Math.max(0, age) / WEEK_MS);
    // Weighted random order (Efraimidis–Spirakis): larger weight → larger expected key.
    week.push({ article, key: Math.pow(unitHash(seed, article.id), 1 / (priority * freshness * (boost?.(article) ?? 1))) });
  }
  week.sort((a, b) => b.key - a.key);
  return [...spreadSources(week.map((entry) => entry.article)), ...older.sort(newestFirst)];
}

/** Avoid three stories from the same publisher in a row, which reads like a single-source feed. */
function spreadSources(list: Article[]) {
  const result = [...list];
  for (let i = 2; i < result.length; i++) {
    if (result[i].source === result[i - 1].source && result[i].source === result[i - 2].source) {
      const swap = result.findIndex((item, index) => index > i && item.source !== result[i].source);
      if (swap > 0) [result[i], result[swap]] = [result[swap], result[i]];
    }
  }
  return result;
}
