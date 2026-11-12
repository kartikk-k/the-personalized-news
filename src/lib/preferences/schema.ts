import { z } from "zod";
import { categorySchema } from "@/lib/news/types";
import { DEFAULT_PRIORITIES } from "@/lib/news/ordering";
export const preferencesSchema = z.object({ hidden: z.array(z.string().min(1).max(100)).max(500), priorities: z.array(categorySchema).max(20) });
export const preferencesPatchSchema = preferencesSchema.partial().refine((data) => data.hidden !== undefined || data.priorities !== undefined);
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = { hidden: [], priorities: DEFAULT_PRIORITIES };
