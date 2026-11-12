import "server-only";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { parseArticleBody, type ArticleNode } from "@/lib/news/parseArticleBody";

export type FullText = { body: ArticleNode[]; image: string | null; byline: string | null; words: number };
const cache = new Map<string, { at: number; pending: Promise<FullText | null> }>();
const RETRY_MS = 60 * 60 * 1000;
const MIN_WORDS = 120;
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/**
 * Publishers whose article pages sit behind a bot wall (AWS WAF, Cloudflare challenge) are read
 * through Jina's public Reader, which renders the page like a browser. `selector` names the story
 * container when Readability alone would pick only part of it.
 */
const readerHosts: Record<string, { selector?: string }> = {
  "arstechnica.com": { selector: ".post-content" },
};

export function countWords(nodes: ArticleNode[]): number {
  return nodes.reduce((total, node) => total + (node.type === "text" ? node.text.split(/\s+/).filter(Boolean).length : countWords(node.children)), 0);
}

const CHROME = /^(no (previous|new|more) articles?|previous article|next article|related( articles| stories)?|share( this)?( article)?|read more|advertisement|sign up for .+|subscribe( now)?|download|embed|transcript|listen[ ·]*\d*:?\d*|listen to this article|\w+ video|video|watch|read next|recommended( for you)?|trending( now)?|most popular|more from .{1,40}|\.\.\.|…)\.?$/i;
function text(node: ArticleNode): string {
  return node.type === "text" ? node.text : node.children.map(text).join("");
}
/** Remove empty blocks and leftover page chrome ("No previous article", "Share", …). */
function withoutChrome(nodes: ArticleNode[]): ArticleNode[] {
  return nodes.filter((node) => {
    if (node.type === "text") return node.text.trim().length > 0;
    if (node.tag === "img" || node.tag === "iframe" || node.tag === "br") return true;
    const value = text(node).replace(/\s+/g, " ").trim();
    return value.length > 0 && !CHROME.test(value);
  });
}

/** Drop pictures before the first paragraph: the page's hero is already shown above the story. */
function withoutLeadingImages(nodes: ArticleNode[]): ArticleNode[] {
  const firstText = nodes.findIndex((node) => node.type === "element" && ["p", "h2", "h3", "blockquote", "ul", "ol"].includes(node.tag) && countWords([node]) > 0);
  return nodes.filter((node, index) => !(index < firstText && node.type === "element" && node.tag === "img"));
}

function shareImage(document: ReturnType<typeof parseHTML>["document"], url: string) {
  const value = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]')?.getAttribute("content");
  try { if (value) { const parsed = new URL(value, url); if (parsed.protocol === "https:") return parsed.href; } } catch { /* No usable share image. */ }
  return null;
}

/** Turn a page (or a story container) into a clean document tree. */
function read(html: string, url: string, fragment: boolean): FullText | null {
  const { document } = parseHTML(fragment ? `<!doctype html><html><head></head><body>${html}</body></html>` : html);
  const image = fragment ? null : shareImage(document, url);
  let content: string | null | undefined;
  let byline: string | null = null;
  if (fragment) content = document.body.innerHTML;
  else {
    const article = new Readability(document as unknown as Document, { charThreshold: 400 }).parse();
    content = article?.content;
    byline = article?.byline?.replace(/^by\s+/i, "").replace(/\s+/g, " ").trim().slice(0, 120) || null;
  }
  if (!content) return null;
  const body = withoutChrome(withoutLeadingImages(parseArticleBody(content, url)));
  const words = countWords(body);
  return words >= MIN_WORDS ? { body, image, byline, words } : null;
}

async function direct(url: string): Promise<{ blocked: boolean; result: FullText | null }> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000),
      headers: { "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9", "User-Agent": BROWSER_UA },
    });
    const blocked = [401, 403, 405, 429, 503].includes(response.status) || response.headers.has("cf-mitigated");
    if (!response.ok || !response.headers.get("content-type")?.includes("html")) return { blocked, result: null };
    const html = await response.text();
    if (html.length > 6_000_000) return { blocked: false, result: null };
    return { blocked: false, result: read(html, url, false) };
  } catch {
    return { blocked: false, result: null };
  }
}

async function viaReader(url: string, selector?: string): Promise<FullText | null> {
  try {
    const headers: Record<string, string> = { "X-Return-Format": "html", "Accept": "text/html" };
    if (selector) headers["X-Target-Selector"] = selector;
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    const response = await fetch(`https://r.jina.ai/${url}`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(45_000), headers });
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length > 8_000_000) return null;
    return read(html, url, Boolean(selector));
  } catch {
    return null;
  }
}

async function extract(url: string): Promise<FullText | null> {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const configured = readerHosts[host];
  if (configured) return viaReader(url, configured.selector);
  const { blocked, result } = await direct(url);
  if (result) return result;
  // Bot walls only: a page that loaded but has no story (audio-only, video) is not retried.
  return blocked ? viaReader(url) : null;
}

/**
 * Many publishers (NPR, BBC, The Record, TechCrunch, Ars Technica…) put only a teaser in their feed.
 * Read the story from the publisher's page instead, Reader-mode style. Results are cached per URL.
 */
export function fetchFullText(url: string): Promise<FullText | null> {
  const entry = cache.get(url);
  if (entry) {
    // Successes are kept; failures are retried at most hourly.
    void entry.pending.then((result) => { if (!result && Date.now() - entry.at > RETRY_MS) cache.delete(url); });
    return entry.pending;
  }
  const pending = extract(url);
  cache.set(url, { at: Date.now(), pending });
  return pending;
}

/** True once a page has been tried and yielded no story (audio-only, video, paywall). */
export async function hasNoStory(url: string) {
  const entry = cache.get(url);
  return entry ? !(await entry.pending) : false;
}
