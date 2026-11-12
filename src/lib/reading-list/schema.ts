import { z } from "zod";
import { articleSchema } from "@/lib/news/types";

const webUrl = z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol));
export const savedArticleSchema = articleSchema.extend({
  id: z.string().regex(/^[a-f0-9]{20}$/),
  title: z.string().max(2000), description: z.string().max(12000),
  url: webUrl.max(4096), image: webUrl.max(4096).nullable(),
  source: z.string().max(300), author: z.string().max(1000),
  imageAlt: z.string().max(2000), imageCredit: z.string().max(1000),
  sourceIds: z.array(z.string().max(100)).max(60),
});
export const savedListSchema = z.object({ version: z.literal(1), articles: z.array(savedArticleSchema).max(1000) });
export const readingListMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), article: savedArticleSchema }),
  z.object({ action: z.literal("remove"), id: z.string().regex(/^[a-f0-9]{20}$/) }),
  z.object({ action: z.literal("import"), articles: z.array(savedArticleSchema).max(1000) }),
]);
export type ReadingListMutation = z.infer<typeof readingListMutationSchema>;
export const readingListResponseSchema = z.object({ articles: z.array(savedArticleSchema), cloud: z.boolean(), authenticated: z.boolean() });
