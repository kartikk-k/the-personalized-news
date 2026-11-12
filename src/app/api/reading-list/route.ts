import { readingListMutationSchema } from "@/lib/reading-list/schema";
import { mutateList, readList } from "@/controllers/server/reading-list/storage";
import { isOwner, ownerId, privateHeaders as headers } from "@/controllers/server/auth/session";
export const maxDuration = 30;
export async function GET(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isOwner()) return Response.json({ articles: [], cloud: !!process.env.BLOB_READ_WRITE_TOKEN, authenticated: false }, { headers });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ articles: [], cloud: false, authenticated: true }, { headers });
  try {
    return Response.json({ articles: (await readList(ownerId)).articles, cloud: true, authenticated: true }, { headers });
  } catch { return Response.json({ error: "Cloud reading list is temporarily unavailable." }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Cloud storage is not configured." }, { status: 503, headers });
  if (!await isOwner()) return Response.json({ error: "Sign in to sync your reading list." }, { status: 401, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "JSON required." }, { status: 415, headers });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Missing data." }, { status: 400, headers });
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 1_000_000) { await reader.cancel(); return Response.json({ error: "Reading-list update is too large." }, { status: 413, headers }); }
    chunks.push(value);
  }
  let data;
  try { data = readingListMutationSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
  catch { return Response.json({ error: "Invalid reading-list update." }, { status: 400, headers }); }
  try {
    return Response.json({ articles: await mutateList(ownerId, data), cloud: true, authenticated: true }, { headers });
  } catch { return Response.json({ error: "Could not sync your reading list. Please retry." }, { status: 503, headers }); }
}
