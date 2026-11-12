import { isOwner, privateHeaders as headers } from "@/controllers/server/auth/session";
import { readPreferences, updatePreferences } from "@/controllers/server/preferences/storage";
import { preferencesPatchSchema } from "@/lib/preferences/schema";
export const maxDuration = 30;
export async function GET() {
  if (!await isOwner()) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try { return Response.json((await readPreferences()).preferences, { headers }); }
  catch { return Response.json({ error: "Preferences unavailable" }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isOwner()) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  let patch;
  try {
    const reader = request.body?.getReader(); if (!reader) throw new Error();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 60000) { await reader.cancel(); throw new Error(); } chunks.push(value); }
    patch = preferencesPatchSchema.parse(JSON.parse(Buffer.concat(chunks).toString()));
  } catch { return Response.json({ error: "Invalid preferences" }, { status: 400, headers }); }
  try { return Response.json(await updatePreferences(patch), { headers }); }
  catch { return Response.json({ error: "Could not save preferences" }, { status: 503, headers }); }
}
