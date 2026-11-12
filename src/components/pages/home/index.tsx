"use client";

import { useState, useEffect, useRef } from "react";
import { useViewedArticles, flushViewedArticles } from "@/components/news/useViewedArticles";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { preferencesSchema, type Preferences } from "@/lib/preferences/schema";
import { ArrowDown, ArrowUp, Refresh } from "@/components/ui/icons";
import { getFeed } from "@/controllers/client/news/getFeed";
import { categoryLabels, sectionTopics, topicLabels, type Article, type Category, type Feed, type Topic } from "@/lib/news/types";
import { orderEdition, VISITED_COOKIE, type EditionMode } from "@/lib/news/ordering";
import { useReadingList, signOutReadingList } from "@/components/news/useReadingList";
import { isUSBased } from "@/lib/news/topics";
import { Header, type Section } from "./Header";
import { SourcesDialog } from "./SourcesDialog";
import { EditionLayout, BLOCK_SIZE } from "./EditionLayout";

function setCookie(name: string, value: string, expires: Date) {
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}
const scrollBehavior = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" as const : "smooth" as const;

/** Called only from the Random button's event handler. */
function pickRandomStory(pool: Article[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = pool.filter((article) => new Date(article.publishedAt).getTime() >= weekAgo);
  const choices = recent.length ? recent : pool.slice(0, 12);
  return choices[Math.floor(Math.random() * choices.length)];
}

function FeedView({ initialFeed, initialMode, seed, initialPriorities, initialViewed, owner, initialHidden }: { initialFeed: Feed; initialMode: EditionMode; seed: number; initialPriorities: Category[]; initialViewed: string[]; owner: boolean; initialHidden: string[] }) {
  const [viewed, setViewed] = useState(initialViewed);
  useViewedArticles(owner);
  const [section, setSection] = useState<Section>("all");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [mode, setMode] = useState(initialMode);
  const [hidden, setHidden] = useState(initialHidden);
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const preferencesLock = useRef(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [priorities, setPriorities] = useState(initialPriorities);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BLOCK_SIZE);
  const [loadMessage, setLoadMessage] = useState("");
  const [edition, setEdition] = useState(initialFeed);
  const sentinel = useRef<HTMLDivElement>(null);
  const saved = useReadingList();
  const router = useRouter();
  const follows = (article: Article) => article.sourceIds.some((id) => !hidden.includes(id));

  // Mark today as visited; until local midnight, later visits get a fresh mix of the week.
  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    setCookie(VISITED_COOKIE, "1", midnight);
  }, []);

  const feed = useQuery({ queryKey: ["news-feed"], queryFn: ({ signal }) => getFeed(signal), initialData: initialFeed.articles.length ? initialFeed : undefined, staleTime: 60_000, refetchInterval: 120_000, retry: 1 });
  // A refreshed edition waits behind a banner so it never moves a story while it is being read.
  const current = edition.articles.length ? edition : (feed.data ?? edition);
  function matchesSelection(article: Article) {
    if (section !== "saved" && !follows(article)) return false;
    // Sports stays out of the paper unless you open U.S. › Sports yourself.
    if (article.topics.includes("sports") && !(section === "us" && topic === "sports") && section !== "saved") return false;
    if (section !== "all" && section !== "saved" && !article.categories.includes(section)) return false;
    if (topic && !article.topics.includes(topic)) return false;
    const q = query.toLowerCase().trim();
    return !q || `${article.title} ${article.description} ${article.source} ${article.categories.join(" ")} ${article.topics.join(" ")}`.toLowerCase().includes(q);
  }
  const newCount = section === "saved" ? 0 : (feed.data?.articles.filter((article) => matchesSelection(article) && !current.articles.some((existing) => existing.id === article.id)).length ?? 0);
  const articles = section === "saved"
    ? saved.articles.filter(matchesSelection)
    : orderEdition(current.articles.filter(matchesSelection), {
      mode: query ? "latest" : mode, seed, priorities, now: current.fetchedAt,
      // Startups leans toward U.S. companies; major deals elsewhere still make the page.
      boost: section === "startups" ? (article) => article.categories.includes("sf") || isUSBased(`${article.title} ${article.description}`) ? 1.4 : 1 : undefined,
    });
  if (owner && section !== "saved") { const seen = new Set(viewed); articles.sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id))); }
  const hasMore = visibleCount < articles.length;

  useEffect(() => {
    if (!hasMore || !sentinel.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisibleCount((count) => count + BLOCK_SIZE); }, { rootMargin: "600px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  function changeSection(value: Section) { setSection(value); setTopic(null); setVisibleCount(BLOCK_SIZE); }
  function changeTopic(value: Topic | null) { setTopic(value); setVisibleCount(BLOCK_SIZE); }
  function changeQuery(value: string) { setQuery(value); setVisibleCount(BLOCK_SIZE); }
  function changeMode(value: EditionMode) { setMode(value); setVisibleCount(BLOCK_SIZE); }
  async function openSources() {
    if (!owner) { router.push("/sign-in"); return; }
    setSourcesOpen(true);
    try {
      const response = await fetch("/api/preferences", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const preferences = preferencesSchema.parse(await response.json());
      if (!preferencesLock.current) { setHidden(preferences.hidden); setPriorities(preferences.priorities); }
    } catch { setPreferencesMessage("Could not refresh settings. Your current choices are shown."); }
  }
  async function savePreferences(patch: Partial<Preferences>) {
    if (!owner || preferencesLock.current) return;
    preferencesLock.current = true; setPreferencesBusy(true); setPreferencesMessage("Saving…");
    try {
      const response = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!response.ok) throw new Error();
      const preferences = preferencesSchema.parse(await response.json());
      setHidden(preferences.hidden); setPriorities(preferences.priorities); setVisibleCount(BLOCK_SIZE);
      setPreferencesMessage("Saved privately across your devices.");
    } catch { setPreferencesMessage("Could not save. Your previous settings are unchanged. Please try again."); }
    finally { preferencesLock.current = false; setPreferencesBusy(false); }
  }
  function toggleSource(id: string) { void savePreferences({ hidden: hidden.includes(id) ? hidden.filter((source) => source !== id) : [...hidden, id] }); }
  function togglePriority(category: Category) { void savePreferences({ priorities: priorities.includes(category) ? priorities.filter((item) => item !== category) : [...priorities, category] }); }
  /** Open a random story published in the past week from the sources you follow. */
  function openRandom() {
    const pool = current.articles.filter((article) => follows(article) && !article.topics.includes("sports"));
    const pick = pickRandomStory(pool);
    if (pick) router.push(`/story/${pick.id}`);
  }
  async function refresh() { if (owner) { await flushViewedArticles(); try { const response = await fetch("/api/history", { cache: "no-store" }); if (response.ok) setViewed((await response.json()).ids); } catch { /* Retain current ordering. */ } } const result = await feed.refetch(); if (result.data) setEdition(result.data); }
  async function loadMore() {
    setLoadMessage("");
    if (hasMore) { setVisibleCount((count) => count + BLOCK_SIZE); return; }
    if (section === "saved") { setLoadMessage("All your saved articles are shown."); return; }
    const result = await feed.refetch();
    if (result.data) {
      const existing = new Set(current.articles.map((article) => article.id));
      const additions = result.data.articles.filter((article) => !existing.has(article.id));
      setEdition({ ...result.data, articles: [...current.articles, ...additions] });
      setVisibleCount((count) => count + BLOCK_SIZE);
      if (!additions.some(matchesSelection)) setLoadMessage("You’re up to date. No more stories are available in these feeds yet.");
    } else setLoadMessage("Couldn’t check for more stories. Please try again.");
  }
  const blocks = [];
  for (let i = 0; i < Math.min(visibleCount, articles.length); i += BLOCK_SIZE) blocks.push(articles.slice(i, Math.min(i + BLOCK_SIZE, visibleCount)));
  const chips = section !== "all" && section !== "saved" ? sectionTopics[section] : undefined;
  const heading = section === "all" ? (mode === "mix" && !query ? "This Week" : "Latest News") : section === "saved" ? "Saved Articles" : categoryLabels[section];

  return <div className="newspaper-shell page-fade">
    <a href="#stories" className="skip-link">Skip to stories</a>
    <Header date={initialFeed.fetchedAt} section={section} onSection={changeSection} onSources={() => { void openSources(); }} onRandom={openRandom} searchOpen={searchOpen} onSearchOpen={(value) => { setSearchOpen(value); if (!value) changeQuery(""); }} query={query} onQuery={changeQuery} savedCount={saved.articles.length} />
    <main id="stories">
      <div className="feed-heading">
        <div className="feed-title">
          <h1>{topic ? `${heading}: ${topicLabels[topic]}` : heading}</h1>
          {chips && <div className="topic-chips" role="group" aria-label={`${heading} topics`}>
            <button aria-pressed={topic === null} onClick={() => changeTopic(null)}>All</button>
            {chips.map((item) => <button key={item} aria-pressed={topic === item} onClick={() => changeTopic(topic === item ? null : item)}>{topicLabels[item]}</button>)}
          </div>}
        </div>
        <div className="feed-status">
          {feed.isError && <span>Refresh unavailable</span>}
          {section !== "saved" && !query && <div className="mode-switch" role="group" aria-label="Story order">
            <button aria-pressed={mode === "mix"} onClick={() => changeMode("mix")} title="Stories from the past week, reshuffled each visit with a lean toward your priorities">Mix</button>
            <button aria-pressed={mode === "latest"} onClick={() => changeMode("latest")} title="Newest first">Latest</button>
          </div>}
          <button className={`icon-button refresh-button ${feed.isFetching ? "is-refreshing" : ""}`} onClick={refresh} disabled={feed.isFetching} aria-label="Refresh news"><Refresh size={13} /></button>
        </div>
      </div>
      {section === "saved" && <div className="feed-notice" role="status">
        {saved.syncState === "synced" ? "Saved privately across your signed-in devices." : saved.syncState === "syncing" ? "Syncing saved articles…" : saved.syncState === "error" ? "Saved on this device. Cloud sync needs another try." : "Saved on this device."}
        {saved.syncState === "signin" && <a href="/sign-in" style={{ textDecoration: "underline" }}>Owner sign-in to sync</a>}
        {saved.syncState === "synced" && <button onClick={() => { void signOutReadingList().catch(() => window.alert("Could not sign out. Please retry.")); }}>Sign out</button>}
        {saved.syncState === "error" && <button onClick={() => { void saved.retrySync(); }}>Retry sync</button>}
      </div>}
      {newCount > 0 && <button className="new-stories" onClick={() => { if (feed.data) setEdition(feed.data); window.scrollTo({ top: 0, behavior: scrollBehavior() }); }}><ArrowUp size={13} /> {newCount} new {newCount === 1 ? "story" : "stories"} — show latest</button>}
      {feed.isError && <div role="status" className="feed-notice">We couldn’t refresh your edition. Previously loaded stories are still available.<button onClick={refresh} disabled={feed.isFetching}>Try again</button></div>}
      {query && <p className="search-results" role="status">{articles.length} {articles.length === 1 ? "story" : "stories"} matching “{query}”</p>}
      {blocks.map((block, index) => <EditionLayout key={`${section}-${topic}-${mode}-${index}`} articles={block} first={index === 0} />)}
      {articles.length === 0 && <div className="empty-state"><h2>{feed.isFetching && !current.articles.length ? "Loading articles…" : section === "saved" ? "No saved articles." : query ? "No stories found." : "Nothing here yet."}</h2><p>{section === "saved" ? "Use the bookmark beside any story to save it to your reading list." : query ? "Try another word, or explore a different section." : topic ? "No recent stories on this topic from the sources you follow." : "We couldn’t reach these publishers just now, or you’ve hidden their feeds."}</p><button className="text-button" onClick={() => { if (section === "saved") changeSection("all"); else if (query) changeQuery(""); else if (topic) changeTopic(null); else void openSources(); }}>{section === "saved" ? "All articles" : query ? "Clear search" : topic ? "Show the whole section" : "Choose your sources"}</button></div>}
      <div className="feed-end" ref={sentinel}>
        <button onClick={loadMore} disabled={feed.isFetching}><ArrowDown size={14} />{feed.isFetching ? "Checking for stories…" : "Load more"}</button>
        {loadMessage && <span role="status">{loadMessage}</span>}
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}>Back to the top <ArrowUp size={12} /></button>
      </div>
    </main>
    <footer className="site-footer"><span className="masthead">The Personalized Time</span><button onClick={() => { void openSources(); }}>Sources &amp; priorities</button>{!owner && <a href="/sign-in">Owner sign-in</a>}</footer>
    <SourcesDialog busy={preferencesBusy} message={preferencesMessage} open={sourcesOpen} onClose={() => setSourcesOpen(false)} sources={(feed.data ?? current).sources} hidden={hidden} onToggle={toggleSource} priorities={priorities} onTogglePriority={togglePriority} />
  </div>;
}

export function Newspaper(props: { initialFeed: Feed; initialMode: EditionMode; seed: number; initialPriorities: Category[]; initialViewed: string[]; owner: boolean; initialHidden: string[] }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}><FeedView {...props} /></QueryClientProvider>;
}
