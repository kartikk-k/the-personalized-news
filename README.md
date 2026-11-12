# The Personalized Time

A Next.js RSS newspaper with private cloud-backed saved articles and browser-local guest preferences and private owner sync.

- Live site: [news.kartikk.io](https://news.kartikk.io/)
- Vercel project: [the-personalized-news](https://vercel.com/kartikkks-projects/the-personalized-news)
- Repository: [kartikk-k/the-personalized-news](https://github.com/kartikk-k/the-personalized-news)

## Run and deploy

```sh
npm ci
npm run dev
# Production check:
npm run build
npm start
```

On Vercel, import the repository with the Next.js preset, use `npm ci` and `npm run build`, and leave the output directory at its framework default. Use Node.js 22 or newer supported by Next.js and enable Fluid Compute. Feed and article routes export a 300-second maximum duration to accommodate publisher timeouts and post-response refresh work. No database or writable filesystem is required. Private JSON storage uses Vercel Blob.

The existing project is linked to the private `personalized-news-saved-articles` Blob store in `iad1`. Vercel supplies `BLOB_READ_WRITE_TOKEN` in Production, Preview and Development. Pull local credentials with `vercel env pull .env.local`; `.env.local` and `.vercel/` are ignored by Git. Never expose the Blob token with a `NEXT_PUBLIC_` prefix.

After checks, deploy with `vercel --prod --scope kartikkks-projects`. The production project serves `news.kartikk.io`.

`JINA_API_KEY` is optional: add it as a server-only Vercel environment variable for higher Jina Reader limits. Never prefix it with `NEXT_PUBLIC_`. Without it, public Reader limits apply. Publisher availability, bot protection, regional restrictions and Jina quotas can differ between your laptop and Vercel; a successful build does not verify those remote conditions. Verify homepage, feed API, article links, images, sign-in and bookmarks after deployment.

## Where data lives

- Saved articles: one owner-only private JSON file in Vercel Blob, containing metadata and source links, not full article bodies. Sign in at `/sign-in` to share the list across your devices. Saved articles have a dedicated authenticated `/saved` route; guest pages hide bookmark controls. There is no signup endpoint.
- Credentials stay server-side: `OWNER_EMAIL`, `OWNER_PASSWORD_HASH` (salted scrypt hash, never the plaintext password), and `OWNER_SESSION_SECRET`. Set these in Vercel Environment Variables; mark Production/Preview values sensitive. Never use a `NEXT_PUBLIC_` prefix. To configure your own instance, generate a random salt and encode the hash as `salt:hexScryptHash`, using Node's `scryptSync(password, salt, 64)`; use a random 32-byte hex session secret. The repository contains no owner's email, password or secret values.
- Login uses a signed, expiring HttpOnly, Secure-in-production, SameSite=Strict cookie. Login and mutations require same-origin requests. Credentials and internal errors are never included in responses. Changing the password hash or session secret invalidates existing sessions. Vercel project administrators with environment access remain trusted; this does not hide secrets from the hosting provider or authorized project administrators.
- localStorage key `modern-times-reading-list` is a local cache/offline fallback. Guests cannot create bookmarks or read or write the owner's cloud list. Local bookmarks are imported once after owner sign-in; pending edits retry on reconnection, focus or Retry sync. Sign-out clears the local private list and pending edits on that browser. The Saved page reports sync status.
- Private reading history records article IDs and view timestamps only for the signed-in owner. At least half a card or story title must remain in the visible viewport for 1.5 seconds. Batches sync every five seconds and on page hide; an interrupted/offline session can lose an unsubmitted batch. History is bounded to 10,000 entries and pruned to 90 days on writes. On reload or manual refresh, unseen stories rank above viewed ones while retaining the edition's order within each group; cards do not jump while scrolling. Guests are not tracked.
- Production uses separate Blob prefixes from development/preview. Server reads bypass the Blob cache and request uncompressed responses to preserve strong ETags. Conditional writes with bounded retries prevent concurrent saves from silently overwriting each other. Web Locks serialize same-browser reconciliation. All list and history access is authenticated server-side; the Blob token never reaches browser JavaScript. Limits: 1,000 saved articles and 1 MB per list mutation.
- Sources and priorities have a dedicated `/sources` page. Guests use localStorage key `tpt-guest-preferences`, shared between tabs on the same origin. The signed-in owner uses private Blob JSON instead, loaded when opening the newspaper or settings page and saved through authenticated updates. Guest preferences never overwrite the cloud profile on login; logging out restores that browser’s guest preferences.
- Visit marker: `mt-visited` cookie, until local midnight. This non-sensitive cookie selects the initial mix/latest mode; it contains no history or owner preferences.
- localStorage is scoped to the exact origin: localhost, preview URLs and production/custom domains have separate data. A redeploy on the same domain preserves the local cache and sign-in cookie; clearing site data removes both. Private browsing storage is temporary.
- Saved metadata and links are not a full-text archive. The internal reader resolves IDs from current publisher feeds; old bookmarks can stop opening internally after the publisher removes the story. The saved card retains its original publisher link.
- Article/feed caches contain public publisher content, not users' bookmarks. No database is configured. In-memory Maps are temporary, per process, and are lost on cold starts or redeploys; separate Vercel instances do not share them.

## Freshness and caching

- RSS requests use Next.js's fetch cache with 300-second revalidation. The assembled in-memory feed also has a five-minute freshness window. Revalidation is request-driven, not a scheduled five-minute crawl; stale content can be served while refreshing or when publishers fail.
- Cold homepage/API requests wait up to nine seconds for an initial partial edition. Remaining work is registered with Next.js `after` so Vercel can keep the invocation alive. Eight feeds are fetched concurrently with 15-second timeouts. A missing article waits for an in-flight refresh before reporting it unavailable.
- Only the five newest stories are considered for background full-text warming. Other stories are extracted on demand, avoiding an unbounded scrape in a serverless invocation.
- Publisher article HTML/Jina responses use 24-hour fetch revalidation. In-process extraction promises expire after one hour; extracted bodies are discarded after 24 hours or after leaving the feed. Failed extraction attempts may therefore retry after an hour. These are caches, not durable archives.
- The browser checks `/api/feed` every two minutes while active, with a one-minute query stale time. New stories wait behind the update banner. Refresh/Load more checks the server cache; it does not forcibly bypass publisher caching.
- Image optimization has a minimum cache TTL of one day (upstream headers can extend it). Fonts are served locally.
- RSS history is finite: at most 15 recent articles per source, up to 45 days old. Load more reveals further loaded stories, then checks for newly available stories and reports when none remain. It does not fabricate an infinite archive.

## External services and content

The server requests configured RSS feeds and publisher article pages. Blocked pages may be sent to `r.jina.ai` as public article URLs. AI buttons open the chosen provider with the article title, source URL and a summary prompt; they do not invoke paid AI APIs on this server. Publisher images/video embeds make requests to their respective services.

The UI currently bundles BBC Reith font files. No license granting this project permission to redistribute these files is present in the repository; confirm permission or replace them with appropriately licensed fonts before public deployment. The older Libre Caslon and Chomsky files have their license files included.
