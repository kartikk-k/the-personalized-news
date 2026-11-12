import Link from "next/link";
import { categoryLabels, type Article } from "@/lib/news/types";
import { ShimmerImage } from "@/components/ui/ShimmerImage";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Right rail: the stories closest in subject to the one being read, best match first. */
export function RelatedStories({ related }: { related: Article[] }) {
  if (!related.length) return null;
  return <section className="related" aria-labelledby="related-title">
    <h2 className="rail-heading" id="related-title">Related reading</h2>
    <ol className="related-list">
      {related.map((item, index) => <li key={item.id}>
        <Link href={`/story/${item.id}`} className={`related-item${index === 0 ? " is-lead" : ""}`}>
          {item.image && <ShimmerImage src={item.image} alt="" sizes={index === 0 ? "(max-width: 960px) 100vw, 380px" : "88px"} priority={index === 0} />}
          <span className="related-copy">
            <span className="related-kicker">{item.categories.map((category) => categoryLabels[category]).join(" / ")}</span>
            <span className="related-title">{item.title}</span>
            {index === 0 && <span className="related-description">{item.description}</span>}
            <span className="related-meta"><time dateTime={item.publishedAt}>{shortDate(item.publishedAt)}</time> · {item.readMinutes} min read</span>
          </span>
        </Link>
      </li>)}
    </ol>
  </section>;
}
