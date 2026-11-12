import { z } from "zod";
import { isOwner, privateHeaders as headers } from "@/controllers/server/auth/session";
import { markViewed, readHistory } from "@/controllers/server/history/storage";
export const maxDuration = 30;
export async function GET() {
  if (!await isOwner()) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try { return Response.json({ ids: Object.keys((await readHistory()).viewed) }, { headers }); }
  catch { return Response.json({ error: "History unavailable" }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isOwner()) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > 12000) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    const { ids } = z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{20}$/)).min(1).max(200) }).parse(JSON.parse(Buffer.concat(chunks).toString()));
    await markViewed(ids);
    return Response.json({ saved: true }, { headers });
  } catch { return Response.json({ error: "Could not update history" }, { status: 400, headers }); }
}
