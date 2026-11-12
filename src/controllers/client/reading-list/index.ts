import { readingListResponseSchema, type ReadingListMutation } from "@/lib/reading-list/schema";

export async function readingListRequest(mutation?: ReadingListMutation) {
  const response = await fetch("/api/reading-list", {
    method: mutation ? "POST" : "GET", cache: "no-store",
    ...(mutation ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(mutation) } : {}),
  });
  if (!response.ok) throw new Error("Cloud reading list unavailable");
  return readingListResponseSchema.parse(await response.json());
}
