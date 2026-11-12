# The Personalized Time

A personal newspaper built with Next.js, bringing stories from your favorite publishers into one readable feed.

## Features

- Browse by topic, search stories, or explore a fresh weekly mix.
- Choose your sources and prioritize the subjects you care about.
- Read articles in a clean layout with a table of contents and reading progress.
- Sign in to save stories and sync your preferences across devices.
- Bring unseen stories forward on refresh using private reading history.

## How it works

Stories come from publishers’ RSS feeds and are cached briefly to keep browsing fast. The reader fetches article text when available and links back to the original publisher. Saved stories keep their details and links, rather than a permanent copy of the full article.

Guests’ source selections and priorities stay in their browser. The owner’s saved stories, preferences, and viewed history are stored as private JSON in Vercel Blob. Only the signed-in owner can access that cloud data. There is one owner account and no signup.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. For a production build, run `npm run build` followed by `npm start`.

## Deploy your own

1. Fork this repository and import your fork into Vercel using the Next.js preset.
2. Create a **private Vercel Blob store** and connect it to your project. This supplies `BLOB_READ_WRITE_TOKEN`.
3. Generate your own login credentials locally:

   ```sh
   node <<'JS'
   const { randomBytes, scryptSync } = require('node:crypto');
   const password = randomBytes(24).toString('base64url');
   const salt = randomBytes(16).toString('hex');
   console.log('Save this password in your password manager:', password);
   console.log('OWNER_PASSWORD_HASH=' + salt + ':' + scryptSync(password, salt, 64).toString('hex'));
   console.log('OWNER_SESSION_SECRET=' + randomBytes(32).toString('hex'));
   JS
   ```

4. In Vercel’s environment settings, add `OWNER_EMAIL` with your email, plus the generated `OWNER_PASSWORD_HASH` and `OWNER_SESSION_SECRET`. Mark production credentials sensitive. These are server-only variables; never prefix them with `NEXT_PUBLIC_` or commit their values.
5. Deploy, then visit `/sign-in` using your email and the generated password. Your reading list lives at `/saved`, and preferences at `/sources`.

To use cloud features locally, link your project with the Vercel CLI and run `vercel env pull .env.local`. This file is Git-ignored. Local development and previews use separate data from production.

Before public deployment, replace the bundled BBC Reith fonts with licensed alternatives unless you have permission to use them.
