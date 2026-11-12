import { isOwner } from "@/controllers/server/auth/session";
import { readPreferences } from "@/controllers/server/preferences/storage";
import { defaultPreferences } from "@/lib/preferences/schema";
import { readHistory } from "@/controllers/server/history/storage";
import { Suspense, ViewTransition } from "react";
import { randomInt } from "node:crypto";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { getFeed } from "@/controllers/server/news/getFeed";
import { Newspaper } from "@/components/pages/home";
import { MastheadLoading } from "@/components/ui/Masthead";
import { VISITED_COOKIE } from "@/lib/news/ordering";

export const maxDuration = 300;

async function Edition() {
  await connection();
  const [feed, jar] = await Promise.all([getFeed(), cookies()]);
  // The first visit of the day reads newest-first; later visits reshuffle the past week.
  const mode = jar.has(VISITED_COOKIE) ? "mix" : "latest";
  const owner = await isOwner();
  const [viewed, preferences] = owner ? await Promise.all([readHistory().then((data) => Object.keys(data.viewed)).catch(() => []), readPreferences().then((data) => data.preferences).catch(() => defaultPreferences)]) : [[], defaultPreferences];
  const seed = randomInt(2 ** 31);
  return <Newspaper initialViewed={viewed} owner={owner} initialFeed={feed} initialMode={mode} seed={seed} initialHidden={preferences.hidden} initialPriorities={preferences.priorities} />;
}

function OpeningEdition() {
  return <div className="opening-edition" role="status" aria-label="Setting today’s newspaper">
    <MastheadLoading />
    <div className="opening-status">
      <span className="opening-rule" aria-hidden="true" />
      <p>Setting today’s newspaper</p>
    </div>
  </div>;
}

export default function Home() {
  return <ViewTransition enter="page-enter" exit="page-exit" default="none">
    <div>
      <Suspense fallback={<ViewTransition exit="page-exit" default="none"><OpeningEdition /></ViewTransition>}>
        <ViewTransition enter="page-enter" default="none"><Edition /></ViewTransition>
      </Suspense>
    </div>
  </ViewTransition>;
}
