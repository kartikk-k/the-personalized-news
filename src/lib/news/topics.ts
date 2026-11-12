import type { Category, Topic } from "./types";

// Headline/summary cues for sub-sections. Deliberately conservative: a miss is better than a mislabel.
const rules: [Topic, RegExp][] = [
  ["immigration", /\b(immigra\w*|deport\w*|asylum|migrants?|border patrol|refugees?|undocumented|green cards?|H-1B)\b/i],
  ["immigration", /\bICE\b/], // case-sensitive: the agency, not frozen water
  ["politics", /\b(elections?|midterms?|congress\w*|senate|senators?|democrats?|republicans?|GOP|white house|supreme court|governors?|ballots?|voters?|lawmakers?|legislat\w*|Trump|Vance)\b/i],
  ["economy", /\b(econom\w*|inflation|tariffs?|recession|GDP|interest rates?|federal reserve|jobs report|unemployment|labor market|trade war|consumer prices?|mortgage rates?)\b/i],
  ["sports", /\b(NFL|NBA|MLB|NHL|WNBA|FIFA|UEFA|olympic\w*|world cup|world series|marathon|super bowl|playoffs?|quarterback|tennis|soccer|football(ers?)?|baseball|basketball|cricket|rugby|golf|Formula 1|Premier League|Champions League|athletes?|Ronaldo|Messi)\b/i],
  ["space", /\b(NASA|astronauts?|spacecraft|space station|planets?|galax(y|ies)|telescopes?|orbit\w*|Mars|lunar|the moon|asteroids?|comets?|cosmic|astronom\w*|exoplanets?)\b/i],
  ["physics", /\b(physic\w*|quantum|particles?|superconduct\w*|black holes?|dark matter|photons?|neutrinos?|fusion)\b/i],
  ["math", /\b(mathemat\w*|theorems?|conjectures?|prime numbers?|geometry|topology|algebra\w*|equations?)\b/i],
  ["funding", /(\braise[sd]?\s+(an?\s+)?[$€£¥]|\bfunding rounds?\b|\bSeries [A-H]\b|\b(pre-)?seed rounds?\b|\bvaluation\b|\bventure capital\b|\bVC (firm|fund)s?\b|\bunicorns?\b|\bfundrais\w*|\bnew fund\b)/i],
  ["acquisitions", /\b(acquir(es|ed|ing)|acquisitions?|merg(er|ers|es|ed)|takeover|to buy|buys|buyout|IPO|goes public|SPAC)\b/i],
  ["ai", /\b(AI|A\.I\.|artificial intelligence|LLMs?|large language models?|machine learning|OpenAI|Anthropic|ChatGPT|Claude|Gemini|agents?)\b/],
  ["hardware", /\b(chips?|chipmakers?|semiconductors?|hardware|GPUs?|Nvidia|TSMC|robot\w*|data cent(er|re)s?|devices?|satellites?)\b/i],
  ["biology", /\b(biolog\w*|cells?|genes?|genetic\w*|genom\w*|proteins?|evolution\w*|species|neurons?|DNA|RNA|microb\w*|bacteria)\b/i],
];

const TECH_SECTIONS: Category[] = ["technology", "startups", "sf", "software", "cybersecurity", "biotech", "business"];
const SF = /\b(San Francisco|Bay Area|Silicon Valley|Palo Alto|Mountain View|Menlo Park|Sunnyvale|Cupertino|San Jose|Oakland|Berkeley|SoMa|Sand Hill Road)\b/;
const US_BASED = /\b(U\.S\.|US|United States|American|Silicon Valley|San Francisco|Bay Area|New York|Seattle|Boston|Austin|Los Angeles|Delaware|Washington)\b/;

/** Add the cross-cutting sections: a tech story about a raise or a deal also files under Startups; a Bay Area tech story under SF. */
export function extraSections(text: string, categories: Category[], topics: Topic[]): Category[] {
  const extra: Category[] = [];
  const techy = categories.some((category) => TECH_SECTIONS.includes(category));
  if (techy && (topics.includes("funding") || topics.includes("acquisitions"))) extra.push("startups");
  if (techy && SF.test(text)) extra.push("sf");
  return extra;
}

export const isUSBased = (text: string) => US_BASED.test(text);

export function tagTopics(text: string, fixed: Topic[] = []): Topic[] {
  const topics = new Set(fixed);
  for (const [topic, pattern] of rules) if (pattern.test(text)) topics.add(topic);
  return [...topics];
}
