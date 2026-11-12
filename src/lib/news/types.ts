import { z } from "zod";

export const categorySchema = z.enum(["technology", "startups", "sf", "cybersecurity", "software", "biotech", "science", "us", "world", "business"]);
export type Category = z.infer<typeof categorySchema>;
export const topicSchema = z.enum(["politics", "immigration", "business", "technology", "sports", "economy", "physics", "math", "space", "biology", "funding", "acquisitions", "ai", "hardware"]);
export type Topic = z.infer<typeof topicSchema>;

export const articleSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), url: z.url(),
  publishedAt: z.iso.datetime(), categories: z.array(categorySchema),
  // Defaults keep reading-list entries saved before these fields existed readable.
  topics: z.array(topicSchema).default([]),
  sourceIds: z.array(z.string()), source: z.string(), author: z.string(),
  image: z.url().nullable(), imageAlt: z.string(), imageCredit: z.string(), readMinutes: z.number(),
  /** False when the publisher's feed carries only a summary; the reader then hands off to the source. */
  fullText: z.boolean().default(true),
});
export type Article = z.infer<typeof articleSchema>;
export const feedSchema = z.object({
  articles: z.array(articleSchema), fetchedAt: z.iso.datetime(),
  sources: z.array(z.object({ id: z.string(), name: z.string(), category: categorySchema,
    url: z.url(), status: z.enum(["ok", "unavailable", "stale"]), count: z.number() })),
});
export type Feed = z.infer<typeof feedSchema>;
export const feedResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: feedSchema, error: z.null() }),
  z.object({ success: z.literal(false), data: z.null(), error: z.object({ code: z.string(), message: z.string() }) }),
]);

export const categoryLabels: Record<Category, string> = {
  technology: "Technology", startups: "Startups & Acquisitions", sf: "San Francisco", cybersecurity: "Cybersecurity", software: "Software Engineering", biotech: "Biotech", science: "Science",
  us: "U.S.", world: "World", business: "Business",
};
/** Short names for the section tabs. */
export const categoryTabLabels: Partial<Record<Category, string>> = { startups: "Startups", sf: "SF", software: "Software" };
/** Order of the section tabs. */
export const categoryOrder: Category[] = ["technology", "startups", "sf", "cybersecurity", "software", "biotech", "science", "us", "world", "business"];
export const topicLabels: Record<Topic, string> = {
  politics: "Politics", immigration: "Immigration", business: "Business", technology: "Technology", sports: "Sports", economy: "Economy",
  physics: "Physics", math: "Math", space: "Space", biology: "Biology",
  funding: "Funding", acquisitions: "Acquisitions", ai: "AI", hardware: "Hardware",
};
/** Sub-sections shown as chips inside a section, like a newspaper's section fronts. */
export const sectionTopics: Partial<Record<Category, Topic[]>> = {
  startups: ["funding", "acquisitions", "ai", "hardware"],
  sf: ["funding", "ai"],
  science: ["physics", "math", "space", "biology"],
  us: ["politics", "immigration", "business", "technology", "sports"],
  world: ["economy"],
  business: ["economy"],
};
