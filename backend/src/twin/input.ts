/**
 * FounderInput (T3) - the raw intake payload the frontend posts to `/api/tag`.
 * Deliberately light: a freeform narrative plus optional structured ToC hints
 * and a self-selected maturity tier. The twin core turns this into a full
 * `ImpactProfile`.
 */

import { z } from "zod";
import { MaturityTier } from "../contract/schema.js";

export const FounderInput = z.object({
  /** Startup name. */
  name: z.string().min(1).max(200),
  /** Sector / domain in the founder's own words (e.g. "Climate hardware"). */
  sector: z.string().min(1).max(200),
  /** Freeform description of what the startup does and the change it seeks. */
  narrative: z.string().min(1).max(20000),
  /** Optional structured Theory-of-Change hints; the LLM fills gaps. */
  toc: z
    .object({
      input: z.string().max(5000).optional(),
      activity: z.string().max(5000).optional(),
      output: z.string().max(5000).optional(),
      outcome: z.string().max(5000).optional(),
      impact: z.string().max(5000).optional(),
    })
    .partial()
    .optional(),
  /** Founder-selected stage; gates how much confidence the tagger may assign. */
  maturity: MaturityTier,
});

export type FounderInput = z.infer<typeof FounderInput>;
