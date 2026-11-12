import type { ArticleNode } from "./parseArticleBody";

export type OutlineEntry = { id: string; label: string; kind: "section" | "question" };
type Element = Extract<ArticleNode, { type: "element" }>;

function textOf(node: ArticleNode): string {
  return node.type === "text" ? node.text : node.children.map(textOf).join("");
}
function meaningful(nodes: ArticleNode[]) {
  return nodes.filter((node) => !(node.type === "text" && !node.text.trim()) && !(node.type === "element" && node.tag === "br"));
}
function clip(text: string, max = 84) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s+\S*$/, "")}…` : clean;
}

/**
 * Publishers like MIT News mark subheads as `<p><strong>…</strong></p>` and interview questions as
 * `<p><strong>Q:</strong> …</p>`. Promote those to real headings/anchors and return a reader outline.
 */
export function outlineArticle(nodes: ArticleNode[]): { body: ArticleNode[]; outline: OutlineEntry[] } {
  const outline: OutlineEntry[] = [];
  const used = new Set<string>();
  function anchor(label: string) {
    const base = label.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 48) || "section";
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  }

  const body = nodes.map((node): ArticleNode => {
    if (node.type !== "element") return node;
    if (node.tag === "h2" || node.tag === "h3") {
      const label = clip(textOf(node));
      if (!label) return node;
      const id = anchor(label);
      outline.push({ id, label, kind: "section" });
      return { ...node, id };
    }
    if (node.tag !== "p") return node;
    const parts = meaningful(node.children);
    const [first] = parts;
    if (!first || first.type !== "element" || first.tag !== "strong") return node;
    const lead = textOf(first).replace(/\u00a0/g, " ").trim();

    if (parts.length === 1 && lead.length > 0 && lead.length <= 80 && !/[.:]$/.test(lead)) {
      const id = anchor(lead);
      outline.push({ id, label: lead, kind: "section" });
      return { type: "element", tag: "h2", id, children: first.children } satisfies Element;
    }
    if (/^Q\s*:?$/i.test(lead) || /^Q:/i.test(lead)) {
      const question = clip(textOf(node).replace(/^\s*Q\s*:\s*/i, ""));
      if (!question) return node;
      const id = anchor(question);
      outline.push({ id, label: question, kind: "question" });
      return { ...node, id, role: "question" };
    }
    return node;
  });
  return { body, outline };
}
