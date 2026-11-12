import "server-only";
import { after } from "next/server";
import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { sources, type Source } from "@/lib/news/sources";
import { articleSchema, type Article, type Feed } from "@/lib/news/types";
import { decodeEntities, parseArticleBody, type ArticleNode } from "@/lib/news/parseArticleBody";
import { extraSections, tagTopics } from "@/lib/news/topics";
import { outlineArticle } from "@/lib/news/outline";
import { rankRelated } from "@/lib/news/related";
import { fetchFullText, type FullText } from "./fetchFullText";

type Media = { $?: { url?: string; medium?: string; type?: string }; "media:credit"?: (string | { _: string })[]; "media:description"?: (string | { _: string })[] };
type Item = {
  media?: Media[]; thumb?: { $?: { url?: string } } | { $?: { url?: string } }[];
  "content:encoded"?: string; "content:encodedSnippet"?: string; summary?: string; author?: string;
};
const parser = new Parser<Record<string, never>, Item>({
  customFields: { item: [["media:content", "media", { keepArray: true }], ["media:thumbnail", "thumb"], "summary"] },
});
const previous = new Map<string, Article[]>();
const articleBodies = new Map<string, ArticleNode[]>();
/** Words of story text the feed itself carried, per article. */
const feedWords = new Map<string, number>();
const MAX_PER_SOURCE = 15;
/** Event promotions, webinars and sponsored posts that some publishers mix into their feeds. */
/** Video, podcast and event pages have no story text to read. */
const NOT_ARTICLE = /\/(video|videos|podcast|podcasts|events|live)\//i;
const PROMO = /\b(tickets?|early[- ]bird|webinars?|sponsored|promo codes?|discount codes?|get your pass|register now)\b/i;
const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;
const FULL_TEXT_WORDS = 220;

function plainText(value = ""): string {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
const text = (value: string | { _: string } | undefined) => plainText(typeof value === "string" ? value : value?._ ?? "");

function safeUrl(value: string | undefined, base?: string): string | null {
  if (!value?.trim()) return null; // an empty value would otherwise resolve to `base` itself
  try { const url = new URL(value ?? "", base); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

/** A short standfirst: publisher boilerplate removed, cut at a sentence near 300 characters. */
function standfirst(html: string): string {
  const clean = plainText(html)
    .replace(/The post .+? appeared first on .+?\.?$/i, "")
    .replace(/\s*(\[(…|\.\.\.|&hellip;)\]|Continue reading.*|Read more.*|Read full article.*)$/i, "")
    .trim();
  if (clean.length <= 320) return clean;
  const cut = clean.slice(0, 320);
  const sentence = cut.lastIndexOf(". ");
  return sentence > 140 ? cut.slice(0, sentence + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
}

function isDecorative(src: string) {
  return /feedburner|gravatar|pixel|tracking|\/1x1|spacer|stats\.wp|doubleclick|\/\/counter\.|\/(undefined|null)$/i.test(src);
}
function firstImage(nodes: ArticleNode[]): Extract<ArticleNode, { type: "element" }> | undefined {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    if (node.tag === "img" && node.src && !isDecorative(node.src)) return node;
    const found = firstImage(node.children);
    if (found) return found;
  }
}
function withoutNode(nodes: ArticleNode[], target: ArticleNode): ArticleNode[] {
  return nodes.filter((node) => node !== target).map((node) => node.type === "element" ? { ...node, children: withoutNode(node.children, target) } : node);
}
function nodeText(nodes: ArticleNode[]): string {
  return nodes.map((node) => node.type === "text" ? node.text : nodeText(node.children)).join(" ");
}

async function readSource(source: Source, now: number) {
  const response = await fetch(source.url, {
    next: { revalidate: 300 }, signal: AbortSignal.timeout(15000),
    headers: { "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml", "User-Agent": "Mozilla/5.0 (compatible; TheModernTimes/1.0; personal news reader)" },
  });
  if (!response.ok) throw new Error("Publisher unavailable");
  const xml = await response.text();
  if (xml.length > 8_000_000) throw new Error("Feed too large");
  const parsed = await parser.parseString(xml);
  const articles: Article[] = [];
  for (const item of parsed.items) {
    if (articles.length >= MAX_PER_SOURCE) break;
    const url = safeUrl(item.link);
    const date = new Date(item.isoDate ?? item.pubDate ?? "");
    if (!url || !item.title || !Number.isFinite(date.getTime()) || now - date.getTime() > MAX_AGE_MS) continue;
    const title = plainText(item.title);
    if (source.skip?.test(title) || PROMO.test(title) || NOT_ARTICLE.test(url)) continue;
    if (source.only && !source.only.test(`${title} ${plainText(item.content ?? item.summary ?? "")}`)) continue;

    // RSS: description + content:encoded. Atom: summary + content. Some feeds only send a description.
    const bodyHtml = item["content:encoded"] ?? item.content ?? "";
    const summaryHtml = item["content:encoded"] ? item.content ?? "" : item.summary ?? item.content ?? "";
    let body = parseArticleBody(bodyHtml, url);

    const media = item.media?.find((m) => safeUrl(m.$?.url, url) && (m.$?.medium === "image" || m.$?.type?.startsWith("image") || !m.$?.medium));
    const thumb = Array.isArray(item.thumb) ? item.thumb[0] : item.thumb;
    let image = safeUrl(media?.$?.url, url) ?? safeUrl(thumb?.$?.url, url)
      ?? (item.enclosure?.type?.startsWith("image") ? safeUrl(item.enclosure.url, url) : null);
    if (image && isDecorative(image)) image = null;
    // BBC ships 240px thumbnails; its image service serves the same picture at newspaper size.
    if (image?.includes("ichef.bbci.co.uk")) image = image.replace(/\/standard\/\d+\//, "/standard/976/");
    if (!image) {
      // Fall back to the first picture in the story, and lift it out of the body so it isn't shown twice.
      const inline = firstImage(body);
      if (inline?.src) { image = inline.src; body = withoutNode(body, inline); }
    }

    const words = nodeText(body).split(/\s+/).filter(Boolean).length;
    // One-line link posts ("Interesting research: …") aren't worth a page of their own.
    if (source.allowShort && words < 40) continue;
    const description = standfirst(summaryHtml || bodyHtml);
    const topics = tagTopics(`${title} ${description}`, source.topics);
    const article = articleSchema.safeParse({
      id: createHash("sha256").update(url).digest("hex").slice(0, 20),
      title, description, url, publishedAt: date.toISOString(),
      categories: [...new Set([...source.categories, ...extraSections(`${title} ${description} ${nodeText(body).slice(0, 700)}`, source.categories, topics)])], topics,
      sourceIds: [source.id], source: source.name,
      author: plainText(item.creator ?? item.author ?? "") || source.name,
      image, imageAlt: text(media?.["media:description"]?.[0]) || title,
      imageCredit: text(media?.["media:credit"]?.[0]) || source.name,
      readMinutes: Math.max(1, Math.ceil(words / 230)),
      // Teaser feeds are never trusted to be complete, whatever their length.
      fullText: !source.teaser && (words >= FULL_TEXT_WORDS || source.allowShort === true),
    });
    if (article.success) {
      articles.push(article.data);
      articleBodies.set(article.data.id, body);
      feedWords.set(article.data.id, words);
    }
  }
  if (articles.length === 0) throw new Error("No recent articles");
  return articles;
}

const FRESH_MS = 5 * 60 * 1000;
const FIRST_PAINT_MS = 9000;
const status = new Map<string, "ok" | "unavailable">();
/** Full stories read from publisher pages for feeds that only carry a teaser. */
const extracted = new Map<string, FullText>();
const extractedAt = new Map<string, number>();
/** Teaser stories whose page had no readable story (audio-only, video, blocked): left out of the paper. */
const unreadable = new Set<string>();
/** Should the reader read this story from the publisher's page rather than the feed? */
const wantsPage = (article: Article) => !article.fullText || (feedWords.get(article.id) ?? 0) < 400;
const minutes = (nodes: ArticleNode[]) => Math.max(1, Math.ceil(nodeText(nodes).split(/\s+/).filter(Boolean).length / 230));
let cached: { feed: Feed; at: number } | null = null;
let refreshing: Promise<void> | null = null;

function assemble(now: number): Feed {
  const unique = new Map<string, Article>();
  for (const source of sources) for (const article of previous.get(source.id) ?? []) {
    if (now - new Date(article.publishedAt).getTime() > MAX_AGE_MS) continue;
    const existing = unique.get(article.id);
    if (existing) {
      existing.categories = [...new Set([...existing.categories, ...article.categories])];
      existing.topics = [...new Set([...existing.topics, ...article.topics])];
      existing.sourceIds = [...new Set([...existing.sourceIds, ...article.sourceIds])];
    } else if (!unreadable.has(article.id)) {
      const full = extracted.get(article.id);
      unique.set(article.id, { ...article, categories: [...article.categories], topics: [...article.topics], sourceIds: [...article.sourceIds],
        ...(full && { fullText: true, readMinutes: minutes(full.body), image: article.image ?? full.image }) });
    }
  }
  return {
    articles: [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id)),
    fetchedAt: new Date(now).toISOString(),
    sources: sources.map((source) => {
      const count = previous.get(source.id)?.length ?? 0;
      const state = status.get(source.id);
      return { id: source.id, name: source.name, category: source.categories[0], url: source.url, count,
        status: state === "ok" ? "ok" as const : count ? "stale" as const : "unavailable" as const };
    }),
  };
}

/** Settle one story: keep the publisher page's text when it adds to the feed's, or drop an unreadable teaser. */
async function resolve(article: Article) {
  const full = await fetchFullText(article.url);
  const fromFeed = feedWords.get(article.id) ?? 0;
  // Use the page when it carries at least the feed's text (pages trim less than feeds do).
  if (full && full.words >= fromFeed * 0.9) {
    extracted.set(article.id, full);
    extractedAt.set(article.id, Date.now());
  }
  else if (!full && !article.fullText && fromFeed < 120) unreadable.add(article.id);
}

/** Read teaser and short stories from publisher pages in the background, newest first, a few at a time. */
async function warmFullText(articles: Article[]) {
  const queue = articles.filter((article) => (wantsPage(article) || !article.image) && !extracted.has(article.id) && !unreadable.has(article.id));
  async function worker() {
    for (let article = queue.shift(); article; article = queue.shift()) await resolve(article);
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  if (cached) cached = { feed: assemble(Date.now()), at: cached.at };
}

/** Fetch every source; each one lands in the cache as soon as it arrives. */
function refresh(): Promise<void> {
  refreshing ??= (async () => {
    const now = Date.now();
    // Eight publishers at a time: forty simultaneous multi-megabyte downloads starve the socket buffers.
    const queue = [...sources];
    async function worker() {
      for (let source = queue.shift(); source; source = queue.shift()) {
        try { previous.set(source.id, await readSource(source, now)); status.set(source.id, "ok"); }
        catch { status.set(source.id, "unavailable"); }
      }
    }
    await Promise.all(Array.from({ length: 8 }, worker));
    const activeIds = new Set([...previous.values()].flat().map((article) => article.id));
    for (const id of articleBodies.keys()) if (!activeIds.has(id)) { articleBodies.delete(id); feedWords.delete(id); }
    for (const id of extracted.keys()) {
      if (!activeIds.has(id) || Date.now() - (extractedAt.get(id) ?? 0) >= 86_400_000) {
        extracted.delete(id); extractedAt.delete(id);
      }
    }
    unreadable.clear();
    cached = { feed: assemble(Date.now()), at: Date.now() };
    await warmFullText(cached.feed.articles.slice(0, 5));
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/**
 * Stale-while-revalidate across ~30 publishers: a warm server answers instantly and refreshes
 * in the background. A cold one waits for the sources that answer within a few seconds;
 * slower publishers join the edition on the next request.
 */
export async function getFeed(): Promise<Feed> {
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.feed;
  const pending = refresh();
  // Keep pending work alive after streaming the response on serverless hosts.
  after(() => pending);
  if (cached) return cached.feed;
  await Promise.race([pending, new Promise((resolve) => setTimeout(resolve, FIRST_PAINT_MS))]);
  // `cached` may have been filled by the refresh while we waited.
  const latest = cached as { feed: Feed } | null;
  return latest?.feed ?? assemble(Date.now());
}

export async function getArticle(id: string) {
  let feed = await getFeed();
  let found = feed.articles.find((item) => item.id === id);
  // A separate cold function may not have received this publisher within the first-paint window.
  if (!found && refreshing) {
    await refreshing;
    feed = cached?.feed ?? assemble(Date.now());
    found = feed.articles.find((item) => item.id === id);
  }
  if (!found) return null;
  let article = found;
  let source = articleBodies.get(id) ?? [];
  // When the feed only had a teaser, read the story from the publisher's page (often already warmed).
  if (!extracted.has(id) && wantsPage(article)) await resolve(article);
  const full = extracted.get(id);
  if (full) {
    source = full.body;
    article = { ...article, fullText: true, readMinutes: minutes(full.body), image: article.image ?? full.image,
      author: article.author === article.source && full.byline ? full.byline : article.author };
  }
  const { body, outline } = outlineArticle(source);
  // Sports only appears alongside sports.
  const pool = article.topics.includes("sports") ? feed.articles : feed.articles.filter((item) => !item.topics.includes("sports"));
  const ranked = rankRelated(article, pool, (articleId) => nodeText(extracted.get(articleId)?.body ?? articleBodies.get(articleId) ?? []));
  // The closest five sit beside the story; the rest paginate below it.
  return { article, body, outline, related: ranked.slice(0, 5), more: ranked.slice(5) };
}
