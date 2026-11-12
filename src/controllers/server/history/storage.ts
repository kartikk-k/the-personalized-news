import "server-only";
import { get, put } from "@vercel/blob";
import { z } from "zod";
const schema = z.record(z.string().regex(/^[a-f0-9]{20}$/), z.number());
const path = () => `reading-history/${process.env.VERCEL_ENV === "production" ? "production" : "development"}/owner.json`;
export async function readHistory() {
  const result = await get(path(), { access: "private", useCache: false, headers: { "Accept-Encoding": "identity" } });
  if (!result) return { viewed: {}, etag: undefined };
  if (!result.stream) throw new Error("History unavailable");
  return { viewed: schema.parse(await new Response(result.stream).json()), etag: result.blob.etag };
}
export async function markViewed(ids: string[]) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readHistory();
    const now = Date.now();
    const viewed = Object.fromEntries(Object.entries({ ...current.viewed, ...Object.fromEntries(ids.map((id) => [id, now])) })
      .filter(([, time]) => now - time < 90 * 86400000).sort((a, b) => b[1] - a[1]).slice(0, 10000));
    try {
      await put(path(), JSON.stringify(viewed), { access: "private", contentType: "application/json", addRandomSuffix: false, cacheControlMaxAge: 60, allowOverwrite: !!current.etag, ...(current.etag ? { ifMatch: current.etag } : {}) });
      return;
    } catch (error) {
      const conflict = error instanceof Error && error.message.startsWith("Vercel Blob: Precondition failed:");
      if (!conflict && (current.etag || !(await readHistory()).etag)) throw error;
      if (attempt === 4) throw error;
    }
  }
}
