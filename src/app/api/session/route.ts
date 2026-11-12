import { cookies } from "next/headers";
import { z } from "zod";
import { configured, privateHeaders as headers, SESSION_COOKIE, startSession, verifyCredentials } from "@/controllers/server/auth/session";

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!configured()) return Response.json({ error: "Sign-in is unavailable." }, { status: 503, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "JSON required." }, { status: 415, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    const input = credentials.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!await verifyCredentials(input.email, input.password)) return Response.json({ error: "Email or password is incorrect." }, { status: 401, headers });
    await startSession();
    return Response.json({ authenticated: true }, { headers });
  } catch { return Response.json({ error: "Unable to sign in. Check your details and try again." }, { status: 400, headers }); }
}
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ authenticated: false }, { headers });
}
