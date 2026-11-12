# The Modern Times

A personal newspaper built with Next.js, React, and TypeScript. Newspaper typography and varied editorial layouts meet a newest-first RSS feed.

## Run locally

```sh
npm install
npm run dev
```

Open the Local URL printed by Next.js (normally http://localhost:3000).

```sh
npm run build
npm start
```

## Feed and sources

Around forty trusted publisher feeds, configured in `src/lib/news/sources.ts` (callers can never supply URLs). Sections: Technology, Startups & Acquisitions, SF, Cybersecurity, Software Engineering, Biotech, Science, U.S., World and Business. Sub-topic chips (e.g. U.S. › Politics / Immigration, Science › Physics / Math / Space / Biology, Startups › Funding / Acquisitions) come from conservative headline/summary rules in `src/lib/news/topics.ts`; tech stories about raises or deals also file under Startups, and Bay Area tech stories under SF. Sports only appears under U.S. › Sports.

Most feeds carry the full article. For teaser-only feeds (NPR, BBC, The Record, The Hacker News, TechCrunch, STAT…) the server reads the story from the publisher's page Reader-mode style (`@mozilla/readability`), warming them in the background. Publishers behind a bot wall (Ars Technica, or any page answering 403/405 or a Cloudflare challenge) are read through Jina's public Reader (`r.jina.ai`); set `JINA_API_KEY` for higher rate limits. Stories whose page has no readable text (audio or video segments) are left out of the paper. Sifted was removed because its stories are paywalled.

The feed is cached in memory (stale-while-revalidate, five minutes). A cold server answers with whatever sources respond within a few seconds and fills in the rest on the next request.

## Ordering

- First visit of the day (a cookie that expires at local midnight): newest first.
- Later visits: the past week is reshuffled each time, leaning gently (≈1.5×) toward prioritized sections and fresher stories; anything older follows, newest first. Startups also leans toward U.S. companies.
- Priorities default to Technology, Cybersecurity, Biotech and Science and are changed in **Sources & priorities**. A Mix/Latest switch overrides the order for the session.

Fifteen stories render per edition block; an intersection observer appends the next block as you scroll. Bookmarks and hidden sources persist in localStorage; the visit and priority cookies drive the server-rendered order.

## Design

- Chomsky: blackletter masthead, by Fredrick R. Brennan. An open font in the style of the NYT nameplate; not the proprietary NYT font.
- Libre Caslon Text: editorial headlines and copy.
- Arial/Helvetica: navigation and metadata.
- Icons: the local Nucleo UI library only (`src/components/ui/icons.tsx`); third-party marks are the official logos (`src/components/ui/brandLogos.tsx`).
- Publisher images go through Next's image optimizer for known hosts (`src/lib/news/imageHosts.ts`); add a host there when adding a source with new image domains.
- Fonts are served locally; licenses are in `public/fonts/`.
- Responsive desktop, tablet, and phone layouts; semantic articles; focus indicators; reduced-motion support; native accessible source dialog.

## Structure

- `src/app/`: routes, API endpoint, metadata, global editorial styles.
- `src/components/pages/home/`: newspaper layout, source controls, feed state.
- `src/components/news/`: article presentation and browser reading list.
- `src/controllers/server/news/`: publisher ingestion.
- `src/controllers/client/news/`: validated browser API access.
- `src/lib/news/`: source configuration and shared Zod contracts.
