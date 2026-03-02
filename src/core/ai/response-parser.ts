import { z } from 'zod';
import type { EnrichmentResult } from './types.js';

const EnrichmentResultSchema = z.object({
  description: z.string().optional(),
  paramDescriptions: z.record(z.string()).optional(),
  returnDescription: z.string().optional(),
  examples: z.array(z.object({
    code: z.string(),
    description: z.string().optional(),
  })).optional(),
  edgeCases: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export function parseEnrichmentResponse(raw: string): EnrichmentResult | null {
  // Try parsing directly
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    // Try extracting JSON from markdown code blocks
    const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        json = JSON.parse(codeBlockMatch[1]);
      } catch {
        return null;
      }
    } else {
      // Try finding JSON object in the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          json = JSON.parse(jsonMatch[0]);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }
  }

  const parsed = EnrichmentResultSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
