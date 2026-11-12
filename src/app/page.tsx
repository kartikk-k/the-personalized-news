import { Suspense, ViewTransition } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { getFeed } from "@/controllers/server/news/getFeed";
import { Newspaper } from "@/components/pages/home";
import { MastheadLoading } from "@/components/ui/Masthead";
import { PRIORITY_COOKIE, VISITED_COOKIE, parsePriorities } from "@/lib/news/ordering";

async function Edition() {
  await connection();
  const [feed, jar] = await Promise.all([getFeed(), cookies()]);
  // The first visit of the day reads newest-first; later visits reshuffle the past week.
  const mode = jar.has(VISITED_COOKIE) ? "mix" : "latest";
  const seed = Math.floor(Math.random() * 2 ** 31);
  return <Newspaper initialFeed={feed} initialMode={mode} seed={seed} initialPriorities={parsePriorities(jar.get(PRIORITY_COOKIE)?.value)} />;
}

function OpeningEdition() {
  return <div className="opening-edition" role="status" aria-label="Setting today’s paper">
    <MastheadLoading />
    <span className="opening-rule" aria-hidden="true" />
    <p>Setting today’s paper</p>
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
