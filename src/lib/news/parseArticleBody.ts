export type ArticleTag = "p" | "h2" | "h3" | "h4" | "strong" | "em" | "a" | "ul" | "ol" | "li" | "blockquote" | "br" | "sup" | "sub" | "img" | "iframe";
export type ArticleNode =
  | { type: "text"; text: string }
  | { type: "element"; tag: ArticleTag; children: ArticleNode[]; href?: string; src?: string; alt?: string; id?: string; role?: "question" };

const tags: Record<string, ArticleTag> = {
  p: "p", h2: "h2", h3: "h3", h4: "h4", strong: "strong", b: "strong", em: "em", i: "em", a: "a",
  ul: "ul", ol: "ol", li: "li", blockquote: "blockquote", br: "br", sup: "sup", sub: "sub", img: "img", iframe: "iframe",
};
const voidTags = new Set(["br", "img", "hr", "input", "meta", "link", "source", "wbr", "embed"]);
const blocked = new Set(["script", "style", "object", "svg", "math", "template", "form", "textarea", "select", "button", "noscript", "figcaption", "aside", "nav"]);
const entities: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", copy: "©", reg: "®", trade: "™",
  ensp: " ", emsp: " ", thinsp: " ", middot: "·", times: "×", plusmn: "±", micro: "µ", deg: "°",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (!entity.startsWith("#")) return entities[entity] ?? match;
    const value = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : "�";
  });
}

function attribute(token: string, name: string): string | undefined {
  const match = token.match(new RegExp(`(?:\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\x60]+))`, "i"));
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3] ?? "") : undefined;
}

function safeUrl(value: string | undefined, base: string): string | undefined {
  if (!value?.trim()) return;
  try {
    const url = new URL(value, base);
    if (["https:", "http:"].includes(url.protocol)) return url.href;
  } catch { /* Invalid publisher links are omitted. */ }
}

/** Convert publisher HTML to a small, safe document tree. No raw HTML or event attributes reach React. */
export function parseArticleBody(html: string, baseUrl: string): ArticleNode[] {
  const root: ArticleNode[] = [];
  const stack: { tag: string; node?: Extract<ArticleNode, { type: "element" }>; blocked: boolean }[] = [];
  function children(): ArticleNode[] {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].node) return stack[i].node!.children;
    return root;
  }
  for (const token of html.match(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+|</gi) ?? []) {
    if (token.startsWith("<!--")) continue;
    if (!token.startsWith("<")) {
      if (!stack.some((entry) => entry.blocked)) children().push({ type: "text", text: decodeEntities(token).replace(/\s+/g, " ") });
      continue;
    }
    const name = token.match(/^<\/?([a-z][\w:-]*)/i)?.[1]?.toLowerCase();
    if (!name) continue;
    if (token.startsWith("</")) {
      const index = stack.map((entry) => entry.tag).lastIndexOf(name);
      if (index !== -1) stack.splice(index);
      continue;
    }
    const isBlocked = blocked.has(name) || stack.some((entry) => entry.blocked);
    if (isBlocked) {
      if (!voidTags.has(name) && !token.endsWith("/>")) stack.push({ tag: name, blocked: true });
      continue;
    }
    // RSS sometimes omits closing paragraph/list-item tags.
    if (["p", "li"].includes(name) && stack.at(-1)?.tag === name) stack.pop();
    // As in HTML, a block opened inside a paragraph closes that paragraph (pages like
    // <p><span><p>…</p></span></p> would otherwise nest paragraphs, which browsers re-parse).
    if (["p", "h2", "h3", "h4", "ul", "ol", "blockquote", "img", "iframe"].includes(name)) {
      const open = stack.map((entry) => entry.tag).lastIndexOf("p");
      if (open !== -1 && name !== "img") stack.splice(open);
    }
    const tag = tags[name];
    if (!tag) {
      if (!voidTags.has(name) && !token.endsWith("/>")) stack.push({ tag: name, blocked: false });
      continue;
    }
    const node: Extract<ArticleNode, { type: "element" }> = { type: "element", tag, children: [] };
    if (tag === "a") node.href = safeUrl(attribute(token, "href"), baseUrl);
    if (tag === "img" || tag === "iframe") {
      node.src = safeUrl(attribute(token, "src"), baseUrl);
      node.alt = attribute(token, tag === "img" ? "alt" : "title") ?? "";
      if (!node.src) continue;
      if (tag === "iframe" && !["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"].includes(new URL(node.src).hostname)) continue;
    }
    children().push(node);
    if (!voidTags.has(name) && !token.endsWith("/>")) stack.push({ tag: name, node, blocked: false });
  }
  return root;
}
