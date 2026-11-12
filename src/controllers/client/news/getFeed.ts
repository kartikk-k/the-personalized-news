import { feedResponseSchema } from "@/lib/news/types";

export async function getFeed(signal?: AbortSignal) {
  const response = await fetch("/api/feed", { signal });
  const body = feedResponseSchema.parse(await response.json());
  if (!body.success) throw new Error(body.error.message);
  if (!response.ok) throw new Error("The news feed could not be refreshed. Please try again.");
  return body.data;
}
