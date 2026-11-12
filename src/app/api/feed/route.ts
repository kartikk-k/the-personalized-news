import { connection } from "next/server";
import { getFeed } from "@/controllers/server/news/getFeed";

export const maxDuration = 300;

export async function GET() {
  // Always live: never prerender ~40 publisher feeds at build time.
  await connection();
  const feed = await getFeed();
  if (!feed.articles.length) return Response.json({ success: false, data: null, error: {
    code: "FEED_UNAVAILABLE", message: "The publisher feeds are temporarily unavailable. Please try again.",
  } }, { status: 503 });
  return Response.json({ success: true, data: feed, error: null });
}
