import type { Category, Topic } from "./types";

export type Source = {
  id: string; name: string; url: string;
  /** The first category is the source's home section; the rest also list its stories. */
  categories: [Category, ...Category[]];
  topics?: Topic[];
  /** Skip items whose title matches (e.g. paywalled teasers). */
  skip?: RegExp;
  /** Keep only items whose headline or summary matches (for general local outlets). */
  only?: RegExp;
  /** The feed carries a teaser or a truncated story: always read the publisher's page. */
  teaser?: boolean;
  /** Very short posts are complete as published (e.g. a blog's one-paragraph notes). */
  allowShort?: boolean;
};

/** SF Standard covers all of city life; the SF section wants its tech, startup and money stories. */
const SF_TECH = /\b(tech\w*|AI|A\.I\.|startups?|founders?|venture|VCs?|investors?|funding|raises?|IPO|acqui\w+|Silicon Valley|OpenAI|Anthropic|Waymo|Tesla|Musk|Salesforce|Uber|Airbnb|Nvidia|Google|Meta|Apple|crypto|robot\w*|software|engineers?)\b/i;
/** TechCrunch mixes event promotions into its feeds. */
const TC_PROMO = /\b(\d+ days? (till|until|left)|TechCrunch (Disrupt|Sessions|Founder Summit|All Stage|Mobility)|tickets?|Save (up to )?\$)/i;

// Trusted publisher feeds only. Most carry the full article; `teaser` sources are read from the
// publisher's page instead. Sifted was dropped: its stories are behind a paywall. Callers can never add URLs.
export const sources: Source[] = [
  // Technology
  { id: "mit-technology", name: "MIT News", categories: ["technology"], url: "https://news.mit.edu/rss/topic/computers" },
  { id: "conversation-technology", name: "The Conversation", categories: ["technology"], url: "https://theconversation.com/us/technology/articles.atom" },
  { id: "ars-technica", name: "Ars Technica", categories: ["technology"], url: "https://feeds.arstechnica.com/arstechnica/index", teaser: true },
  { id: "npr-technology", name: "NPR", categories: ["technology", "us"], topics: ["technology"], url: "https://feeds.npr.org/1019/rss.xml", teaser: true },
  // Startups & acquisitions
  { id: "crunchbase", name: "Crunchbase News", categories: ["startups"], url: "https://news.crunchbase.com/feed/" },
  { id: "techcrunch-venture", name: "TechCrunch", categories: ["startups"], url: "https://techcrunch.com/category/venture/feed/", skip: TC_PROMO, teaser: true },
  { id: "techcrunch-startups", name: "TechCrunch", categories: ["startups"], url: "https://techcrunch.com/category/startups/feed/", skip: TC_PROMO, teaser: true },
  { id: "geekwire", name: "GeekWire", categories: ["startups", "technology"], url: "https://www.geekwire.com/feed/" },
  { id: "tech-eu", name: "Tech.eu", categories: ["startups"], url: "https://tech.eu/feed/" },
  // San Francisco
  { id: "sf-standard-business", name: "The San Francisco Standard", categories: ["sf"], url: "https://sfstandard.com/category/business/feed/", only: SF_TECH, teaser: true },
  { id: "sf-standard", name: "The San Francisco Standard", categories: ["sf"], url: "https://sfstandard.com/feed/", only: SF_TECH, teaser: true },
  // Cybersecurity
  { id: "krebs", name: "Krebs on Security", categories: ["cybersecurity"], url: "https://krebsonsecurity.com/feed/" },
  { id: "schneier", name: "Schneier on Security", categories: ["cybersecurity"], url: "https://www.schneier.com/feed/atom/", allowShort: true },
  { id: "conversation-cybersecurity", name: "The Conversation", categories: ["cybersecurity"], url: "https://theconversation.com/topics/cybersecurity-535/articles.atom" },
  { id: "the-record", name: "The Record", categories: ["cybersecurity"], url: "https://therecord.media/feed", teaser: true },
  { id: "hacker-news-thn", name: "The Hacker News", categories: ["cybersecurity"], url: "https://feeds.feedburner.com/TheHackersNews", teaser: true },
  { id: "project-zero", name: "Google Project Zero", categories: ["cybersecurity"], url: "https://googleprojectzero.blogspot.com/feeds/posts/default" },
  { id: "cloudflare-security", name: "Cloudflare", categories: ["cybersecurity"], url: "https://blog.cloudflare.com/tag/security/rss/" },
  // Software engineering
  { id: "github-engineering", name: "GitHub", categories: ["software"], url: "https://github.blog/engineering/feed/" },
  { id: "meta-engineering", name: "Engineering at Meta", categories: ["software"], url: "https://engineering.fb.com/feed/" },
  { id: "netflix-tech", name: "Netflix TechBlog", categories: ["software"], url: "https://netflixtechblog.com/feed" },
  { id: "pragmatic-engineer", name: "The Pragmatic Engineer", categories: ["software"], url: "https://blog.pragmaticengineer.com/rss/" },
  { id: "cloudflare", name: "Cloudflare", categories: ["software"], url: "https://blog.cloudflare.com/rss/" },
  // Biotech
  { id: "mit-biotech", name: "MIT News", categories: ["biotech"], url: "https://news.mit.edu/topic/mitbiological-engineering-rss.xml" },
  { id: "stat", name: "STAT", categories: ["biotech"], url: "https://www.statnews.com/feed/", skip: /^STAT\+/, teaser: true },
  { id: "conversation-biotech", name: "The Conversation", categories: ["biotech"], url: "https://theconversation.com/topics/biotechnology-1017/articles.atom" },
  { id: "conversation-genetics", name: "The Conversation", categories: ["biotech"], url: "https://theconversation.com/topics/genetics-1013/articles.atom" },
  // Science
  { id: "mit-physics", name: "MIT News", categories: ["science"], topics: ["physics"], url: "https://news.mit.edu/topic/mitphysics-rss.xml" },
  { id: "mit-mathematics", name: "MIT News", categories: ["science"], topics: ["math"], url: "https://news.mit.edu/topic/mitmathematics-rss.xml" },
  { id: "mit-biology", name: "MIT News", categories: ["science"], topics: ["biology"], url: "https://news.mit.edu/topic/mitbiology-rss.xml" },
  { id: "quanta", name: "Quanta Magazine", categories: ["science"], url: "https://www.quantamagazine.org/feed/", teaser: true },
  { id: "nasa", name: "NASA", categories: ["science"], topics: ["space"], url: "https://www.nasa.gov/news-release/feed/", allowShort: true },
  { id: "harvard-gazette-science", name: "Harvard Gazette", categories: ["science"], url: "https://news.harvard.edu/gazette/section/science-technology/feed/" },
  { id: "science-news", name: "Science News", categories: ["science"], url: "https://www.sciencenews.org/feed", teaser: true },
  // U.S.
  { id: "propublica", name: "ProPublica", categories: ["us"], url: "https://www.propublica.org/feeds/propublica/main" },
  { id: "conversation-politics", name: "The Conversation", categories: ["us"], topics: ["politics"], url: "https://theconversation.com/us/politics/articles.atom" },
  { id: "npr-national", name: "NPR", categories: ["us"], url: "https://feeds.npr.org/1003/rss.xml", teaser: true },
  { id: "npr-politics", name: "NPR", categories: ["us"], topics: ["politics"], url: "https://feeds.npr.org/1014/rss.xml", teaser: true },
  { id: "npr-sports", name: "NPR", categories: ["us"], topics: ["sports"], url: "https://feeds.npr.org/1055/rss.xml", teaser: true },
  // World
  { id: "conversation-world", name: "The Conversation", categories: ["world"], url: "https://theconversation.com/us/world/articles.atom" },
  { id: "npr-world", name: "NPR", categories: ["world"], url: "https://feeds.npr.org/1004/rss.xml", teaser: true },
  { id: "bbc-world", name: "BBC News", categories: ["world"], url: "https://feeds.bbci.co.uk/news/world/rss.xml", teaser: true },
  // Business & economy
  { id: "liberty-street", name: "Liberty Street Economics", categories: ["business", "us"], topics: ["economy", "business"], url: "https://libertystreeteconomics.newyorkfed.org/feed/" },
  { id: "conversation-business", name: "The Conversation", categories: ["business"], url: "https://theconversation.com/us/business/articles.atom" },
  { id: "npr-business", name: "NPR", categories: ["business", "us"], topics: ["business"], url: "https://feeds.npr.org/1006/rss.xml", teaser: true },
];
