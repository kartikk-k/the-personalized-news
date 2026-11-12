import type { Article } from "./types";

const STOP = new Set(("about above after again against also among and another any are around because been before being below between both but can could did does doing down during each even every few first for from further had has have having her here hers him his how however into its itself just last like made make many may more most much must new news now off once one only other our out over own said same says she should since some still such than that the their them then there these they this those though through too two under until upon very was way well were what when where which while who whom why will with within without would year years you your mit researchers research university professor study team work works used using use also says said").split(" "));

function tokens(text: string): string[] {
  return (text.toLowerCase().normalize("NFKD").match(/[a-z][a-z0-9-]{2,}/g) ?? [])
    .map((word) => word.replace(/(?:'s|ies|es|s)$/, (end) => end === "ies" ? "y" : ""))
    .filter((word) => word.length > 2 && !STOP.has(word));
}

function weigh(article: Article, body: string) {
  const counts = new Map<string, number>();
  const add = (text: string, weight: number) => { for (const token of tokens(text)) counts.set(token, (counts.get(token) ?? 0) + weight); };
  add(article.title, 4);
  add(article.description, 2);
  add(body, 1);
  return counts;
}

/**
 * Rank other stories by how closely they discuss the same subject as `target`
 * (TF-IDF cosine over headline, summary and body), with a small nudge for a shared section.
 */
export function rankRelated(target: Article, articles: Article[], bodyText: (id: string) => string): Article[] {
  const vectors = new Map(articles.map((article) => [article.id, weigh(article, bodyText(article.id))]));
  const documentFrequency = new Map<string, number>();
  for (const vector of vectors.values()) for (const token of vector.keys()) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  const total = articles.length;
  function tfidf(vector: Map<string, number>) {
    const result = new Map<string, number>();
    let norm = 0;
    for (const [token, count] of vector) {
      const value = (1 + Math.log(count)) * Math.log(1 + total / (documentFrequency.get(token) ?? 1));
      result.set(token, value);
      norm += value * value;
    }
    return { result, norm: Math.sqrt(norm) || 1 };
  }
  const base = tfidf(vectors.get(target.id) ?? weigh(target, bodyText(target.id)));
  return articles
    .filter((article) => article.id !== target.id)
    .map((article) => {
      const other = tfidf(vectors.get(article.id)!);
      let dot = 0;
      for (const [token, value] of base.result) dot += value * (other.result.get(token) ?? 0);
      const sameSection = article.categories.some((category) => target.categories.includes(category)) ? 0.03 : 0;
      return { article, score: dot / (base.norm * other.norm) + sameSection };
    })
    .sort((a, b) => b.score - a.score || b.article.publishedAt.localeCompare(a.article.publishedAt))
    .map(({ article }) => article);
}
