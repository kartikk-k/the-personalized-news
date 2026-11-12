import { PageLoading } from "@/components/ui/PageLoading";
import { Suspense } from "react";
import { connection } from "next/server";
import { isOwner } from "@/controllers/server/auth/session";
import { getFeed } from "@/controllers/server/news/getFeed";
import { readPreferences } from "@/controllers/server/preferences/storage";
import { defaultPreferences } from "@/lib/preferences/schema";
import { SourcesPage } from "@/components/pages/sources";
export const maxDuration = 300;
export const metadata = { title: "Sources & priorities — The Personalized Time" };
async function Settings() {
  await connection();
  const [owner, feed] = await Promise.all([isOwner(), getFeed()]);
  const initial = owner ? (await readPreferences()).preferences : defaultPreferences;
  return <SourcesPage date={feed.fetchedAt} sources={feed.sources} owner={owner} initial={initial} />;
}
export default function Page() { return <Suspense fallback={<PageLoading message="Loading sources…" />}><Settings /></Suspense>; }
