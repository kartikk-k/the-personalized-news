import { createElement, Fragment } from "react";
import type { ArticleNode } from "@/lib/news/parseArticleBody";
import { ShimmerImage } from "@/components/ui/ShimmerImage";

function ContentNode({ node }: { node: ArticleNode }) {
  if (node.type === "text") return node.text;
  const children = node.children.map((child, index) => <ContentNode key={index} node={child} />);
  if (node.tag === "a") return node.href ? <a href={node.href} target="_blank" rel="noreferrer">{children}</a> : <Fragment>{children}</Fragment>;
  if (node.tag === "br") return <br />;
  if (node.tag === "img") return node.src ? <ShimmerImage src={node.src} alt={node.alt ?? ""} sizes="(max-width: 720px) 100vw, 680px" fluid /> : null;
  if (node.tag === "iframe") return <iframe src={node.src} title={node.alt || "Article video"} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
  return createElement(node.tag, { id: node.id, className: node.role === "question" ? "is-question" : undefined }, children);
}

export function ArticleBody({ content }: { content: ArticleNode[] }) {
  return <div className="article-body" id="story-body">{content.map((node, index) => <ContentNode key={index} node={node} />)}</div>;
}
