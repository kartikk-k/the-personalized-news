import Link from "next/link";
import { categoryLabels, type Article } from "@/lib/news/types";
import { Masthead } from "@/components/ui/Masthead";
import { MiniMasthead } from "@/components/ui/MiniMasthead";
import { ArrowLeft } from "@/components/ui/icons";
import { ChatGPTLogo, ClaudeLogo, PerplexityLogo } from "@/components/ui/brandLogos";

export function ReaderHeader() {
  return <header className="reader-header">
    <Link href="/" className="reader-back"><ArrowLeft size={14} /><span>Today’s paper</span></Link>
    <Masthead />
    <span aria-hidden="true" />
  </header>;
}

function askPrompt(article: Article) {
  const date = new Date(article.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `I’m reading “${article.title}” (${article.source}, ${date}): ${article.url}\n\nSummarize the story, explain the key ideas and any background I need, and suggest what to explore next.`;
}

export function askLinks(article: Article) {
  const q = encodeURIComponent(askPrompt(article));
  return [
    { name: "Claude", href: `https://claude.ai/new?q=${q}`, Icon: ClaudeLogo },
    { name: "ChatGPT", href: `https://chatgpt.com/?q=${q}`, Icon: ChatGPTLogo },
    { name: "Perplexity", href: `https://www.perplexity.ai/search?q=${q}`, Icon: PerplexityLogo },
  ];
}

/** Sticky strip under the masthead: where the story lives, and where to take it next. */
export function ReaderToolbar({ article }: { article: Article }) {
  return <div className="reader-toolbar">
    <div className="toolbar-inner">
      <div className="toolbar-context">
        <span className="toolbar-section">{article.categories.map((category) => categoryLabels[category]).join(" / ")}</span>
        <span className="toolbar-title" aria-hidden="true">{article.title}</span>
      </div>
      <MiniMasthead watch=".reader-header .masthead" />
      <nav className="toolbar-actions" aria-label="Continue with this story">
        <span className="toolbar-label">Ask about this</span>
        {askLinks(article).map(({ name, href, Icon }) => <a key={name} className="ask-link" href={href} target="_blank" rel="noreferrer" aria-label={`Ask ${name} about this story`}><Icon size={15} /><span className="ask-name">{name}</span></a>)}
        <span className="toolbar-divider" aria-hidden="true" />
        <a className="source-button" href={article.url} target="_blank" rel="noreferrer">Original story</a>
      </nav>
    </div>
    <span className="reader-progress" aria-hidden="true" />
  </div>;
}
