import "server-only";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { savedListSchema, type ReadingListMutation } from "@/lib/reading-list/schema";
import type { Article } from "@/lib/news/types";

function pathname(owner: string) {
  if (!/^[a-f0-9]{64}$/.test(owner)) throw new Error("Invalid reading-list identity");
  // Preview and local development must never mutate production bookmarks.
  const environment = process.env.VERCEL_ENV === "production" ? "production" : "development";
  return `reading-lists/${environment}/${owner}.json`;
}
export async function readList(owner: string) {
  const result = await get(pathname(owner), { access: "private", useCache: false, headers: { "Accept-Encoding": "identity" } });
  if (!result) return { articles: [] as Article[], etag: undefined };
  if (!result.stream) throw new Error("Missing reading-list data");
  const data = savedListSchema.parse(await new Response(result.stream).json());
  return { articles: data.articles, etag: result.blob.etag };
}
export async function mutateList(owner: string, mutation: ReadingListMutation) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await readList(owner);
    let articles = current.articles;
    if (mutation.action === "remove") articles = articles.filter((article) => article.id !== mutation.id);
    if (mutation.action === "save") articles = [mutation.article, ...articles.filter((article) => article.id !== mutation.article.id)];
    if (mutation.action === "import") {
      const known = new Set(articles.map((article) => article.id));
      articles = [...articles, ...mutation.articles.filter((article) => {
        if (known.has(article.id)) return false;
        known.add(article.id); return true;
      })];
    }
    const data = savedListSchema.parse({ version: 1, articles });
    try {
      await put(pathname(owner), JSON.stringify(data), {
        access: "private", contentType: "application/json", addRandomSuffix: false,
        cacheControlMaxAge: 60, allowOverwrite: Boolean(current.etag),
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return data.articles;
    } catch (error) {
      // An initial creation can race too: re-read only when the object now exists.
      if (!(error instanceof BlobPreconditionFailedError || (error instanceof Error && (error.name === "BlobPreconditionFailedError" || error.message.startsWith("Vercel Blob: Precondition failed:")))) && (current.etag || !(await readList(owner)).etag)) throw error;
      if (attempt === 3) throw error;
    }
  }
  throw new Error("Reading list is busy; please retry");
}
