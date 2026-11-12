import "server-only";
import { get, put } from "@vercel/blob";
import { preferencesSchema, defaultPreferences, type Preferences } from "@/lib/preferences/schema";
const path = () => `preferences/${process.env.VERCEL_ENV === "production" ? "production" : "development"}/owner.json`;
export async function readPreferences() {
  const result = await get(path(), { access: "private", useCache: false, headers: { "Accept-Encoding": "identity" } });
  if (!result) return { preferences: defaultPreferences, etag: undefined };
  if (!result.stream) throw new Error("Preferences unavailable");
  return { preferences: preferencesSchema.parse(await new Response(result.stream).json()), etag: result.blob.etag };
}
export async function updatePreferences(patch: Partial<Preferences>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readPreferences();
    const preferences = preferencesSchema.parse({ ...current.preferences, ...patch });
    try {
      await put(path(), JSON.stringify(preferences), { access: "private", contentType: "application/json", addRandomSuffix: false, cacheControlMaxAge: 60, allowOverwrite: !!current.etag, ...(current.etag ? { ifMatch: current.etag } : {}) });
      return preferences;
    } catch (error) {
      const conflict = error instanceof Error && error.message.startsWith("Vercel Blob: Precondition failed:");
      if (!conflict && (current.etag || !(await readPreferences()).etag)) throw error;
      if (attempt === 4) throw error;
    }
  }
  throw new Error("Preferences busy");
}
