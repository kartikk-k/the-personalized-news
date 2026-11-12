/**
 * Publisher image hosts that Next.js may fetch and resize (see `images.remotePatterns` in
 * next.config.ts). Pictures from any other host are shown as-is, unoptimized.
 */
export const imageHosts = [
  "news.mit.edu",
  "images.theconversation.com",
  "cdn.arstechnica.net",
  "npr.brightspotcdn.com",
  "media.npr.org",
  "ichef.bbci.co.uk",
  "www.propublica.org",
  "krebsonsecurity.com",
  "cms.therecord.media",
  "blog.cloudflare.com",
  "engineering.fb.com",
  "cdn-images-1.medium.com",
  "miro.medium.com",
  "storage.ghost.io",
  "projectzero.google",
  "github.blog",
  "www.statnews.com",
  "www.schneier.com",
  "libertystreeteconomics.newyorkfed.org",
  "www.nasa.gov",
  "www.quantamagazine.org",
  "news.harvard.edu",
  "www.sciencenews.org",
  "news.crunchbase.com",
  "cdn.geekwire.com",
  "www.geekwire.com",
  "tech.eu",
  "techcrunch.com",
  "blogger.googleusercontent.com",
  "sfstandard.com",
  "images.sfstandard.com",
];

export function isOptimizable(src: string) {
  try { const url = new URL(src); return url.protocol === "https:" && imageHosts.includes(url.hostname); }
  catch { return false; }
}
