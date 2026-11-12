import { Suspense, ViewTransition } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getArticle } from "@/controllers/server/news/getFeed";
import { categoryLabels } from "@/lib/news/types";
import { ArticleImage } from "@/components/news/ArticleCard";
import { ArticleBody } from "@/components/news/ArticleBody";
import { ReaderHeader, ReaderToolbar } from "@/components/pages/story/ReaderChrome";
import { ReaderContents } from "@/components/pages/story/ReaderContents";
import { RelatedStories } from "@/components/pages/story/RelatedStories";
import { MoreStories } from "@/components/pages/story/MoreStories";

export const maxDuration = 300;

async function Story({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const result = await getArticle(id);
  if (!result) return <div className="empty-state page-fade"><h1>This story has left the current feed.</h1><p>Publishers keep only their most recent stories in RSS. Today’s paper has the latest.</p><Link className="text-button" href="/">Back to today’s paper</Link></div>;
  const { article, body, outline, related, more } = result;
  const [author, desk] = article.author.split(/\s+\|\s+/);
  const section = article.categories.map((category) => categoryLabels[category]).join(" / ");
  const published = new Date(article.publishedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

  return <div className="page-fade">
    <ReaderToolbar article={article} outline={outline} />
    <div className="reader-grid">
      <aside className="reader-rail rail-left"><ReaderContents article={article} outline={outline} /></aside>
      <article className="reader-article">
        <header className="story-head" id="overview">
          <div className="eyebrow">{section}</div>
          <h1 data-article-id={article.id}>{article.title}</h1>
          <p className="story-deck">{article.description}</p>
          <div className="story-byline">
            <span>By <strong>{author}</strong>{desk && <>, {desk}</>}</span>
            <span><time dateTime={article.publishedAt}>{published}</time>{article.fullText && <><span className="meta-dot">·</span>{article.readMinutes} min read</>}</span>
          </div>
        </header>
        <ArticleImage article={article} priority />
        {outline.length > 0 && <details className="contents-inline">
          <summary>In this story <span>{outline.length} {outline.length === 1 ? "section" : "sections"}</span></summary>
          <ol>{outline.map((entry) => <li key={entry.id} data-kind={entry.kind}><a href={`#${entry.id}`}>{entry.label}</a></li>)}</ol>
        </details>}
        <ArticleBody content={body} />
        {!article.fullText && <div className="source-handoff">
          <p>{article.source} shares only the opening of this story in its feed. The full report is on their site.</p>
          <a className="dark-button" href={article.url} target="_blank" rel="noreferrer">Continue reading at {article.source}</a>
        </div>}
        <footer className="article-attribution" id="source-notes">
          <span className="end-mark" aria-hidden="true">■</span>
          <p>Originally published by <a href={article.url} target="_blank" rel="noreferrer">{article.source}</a>. Reporting and imagery by the credited contributors; image: {article.imageCredit}.</p>
        </footer>
      </article>
      <aside className="reader-rail rail-right"><RelatedStories related={related} /></aside>
    </div>
    <MoreStories key={article.id} initialArticles={more} excludedIds={[article.id, ...related.map((item) => item.id)]} includeSports={article.topics.includes("sports")} />
  </div>;
}

function ReaderSkeleton() {
  return <div className="reader-skeleton" role="status" aria-label="Opening the story">
    <div className="skeleton-toolbar" />
    <div className="reader-grid">
      <div className="reader-rail rail-left" />
      <div className="reader-article">
        <span className="skeleton-line" style={{ width: "18%" }} />
        <span className="skeleton-line is-title" style={{ width: "92%" }} />
        <span className="skeleton-line is-title" style={{ width: "64%" }} />
        <span className="skeleton-line" style={{ width: "88%" }} />
        <span className="skeleton-line" style={{ width: "72%" }} />
        <span className="skeleton-block" />
      </div>
      <div className="reader-rail rail-right" />
    </div>
  </div>;
}

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  return <ViewTransition enter="page-enter" exit="page-exit" default="none">
    <div className="newspaper-shell reader-shell">
      <ReaderHeader />
      <main>
        <Suspense fallback={<ViewTransition exit="page-exit" default="none"><ReaderSkeleton /></ViewTransition>}>
          <ViewTransition enter="page-enter" default="none"><Story params={params} /></ViewTransition>
        </Suspense>
      </main>
      <footer className="reader-footer"><span className="masthead">The Personalized Time</span></footer>
    </div>
  </ViewTransition>;
}
