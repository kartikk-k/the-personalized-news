import type { Article } from "@/lib/news/types";
import { ArticleCard } from "@/components/news/ArticleCard";

/** Stories per edition block; the infinite feed grows one block at a time. */
export const BLOCK_SIZE = 15;

/**
 * One newspaper "page": a lead package with follow-up headlines, three compact rows,
 * a rich right rail (feature, pair, headline list) and a row of briefs.
 */
export function EditionLayout({ articles, first, priority = first }: { articles: Article[]; first: boolean; priority?: boolean }) {
  if (!articles.length) return null;
  // Picture-led slots (the lead and the rail feature) take the next story that has a picture.
  const pool = [...articles];
  const take = (from: number) => {
    const index = pool.findIndex((article, position) => position >= from && article.image);
    return pool.splice(index === -1 || index > from + 3 ? from : index, 1)[0];
  };
  const lead = take(0);
  // `pool` is now [also×2, rows×3, feature, …]: give the rail feature (position 5) a picture too.
  const featured = pool.length > 5 ? take(5) : undefined;
  if (featured) pool.splice(5, 0, featured);
  const rest = pool;
  const also = rest.slice(0, 2);
  const rows = rest.slice(2, 5);
  const feature = rest[5];
  const pair = rest.slice(6, 8);
  const list = rest.slice(8, 10);
  const briefs = rest.slice(10, 14);
  return <section className="edition-block" aria-label={first ? "Top stories" : "More stories"}>
    {!first && <div className="section-divider" />}
    <div className={`editorial-grid${feature ? "" : " is-single"}`}>
      <div className="main-column">
        <ArticleCard article={lead} variant="lead" priority={priority} also={also} />
        {rows.length > 0 && <div className="main-rows">{rows.map((article) => <ArticleCard key={article.id} article={article} variant="row" />)}</div>}
      </div>
      {feature && <aside className="side-column" aria-label="More stories">
        <ArticleCard article={feature} variant="rail" />
        {pair.length > 0 && <div className="rail-pair">{pair.map((article) => <ArticleCard key={article.id} article={article} variant="pair" />)}</div>}
        {list.length > 0 && <div className="rail-list">{list.map((article) => <ArticleCard key={article.id} article={article} variant="thumb" />)}</div>}
      </aside>}
    </div>
    {briefs.length > 0 && <div className="briefs-row">{briefs.map((article) => <ArticleCard key={article.id} article={article} variant="brief" />)}</div>}
  </section>;
}
