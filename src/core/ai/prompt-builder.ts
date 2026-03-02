import type { DocEntry } from '../../shared/types.js';
import type { EnrichmentRequestContext } from './types.js';
import { LANGUAGE_NAMES } from '../../shared/constants.js';

export class PromptBuilder {
  buildSystemPrompt(): string {
    return `You are a technical documentation expert. Given a code declaration (function, class, struct, etc.) with its signature and context, generate accurate, helpful documentation.

You MUST respond with valid JSON only. No markdown wrapping, no explanation text outside the JSON.

Response schema:
{
  "description": "A clear, concise description of what this code does and why someone would use it",
  "paramDescriptions": { "paramName": "description of the parameter" },
  "returnDescription": "description of what is returned",
  "examples": [{ "code": "usage example code", "description": "what the example demonstrates" }],
  "edgeCases": ["edge case or important note"],
  "related": ["name of related function/type"],
  "tags": ["category tag"]
}

Rules:
- Only include fields that are relevant. Omit empty fields.
- For paramDescriptions, only include params that exist in the signature.
- Examples should be minimal but complete — compilable if possible.
- Use the same language as the source code for examples.
- Edge cases should mention null handling, thread safety, performance, or error conditions.
- Tags should be categorization labels like "networking", "memory", "parsing", etc.
- Be precise about types and semantics. Never guess at implementation details you can't infer.`;
  }

  buildUserPrompt(entry: DocEntry, context: EnrichmentRequestContext): string {
    const parts: string[] = [];

    const langName = LANGUAGE_NAMES[entry.language] || entry.language;
    parts.push(`Language: ${langName}`);
    parts.push(`Kind: ${entry.kind}`);
    parts.push(`Signature:\n\`\`\`\n${entry.signature}\n\`\`\``);

    if (entry.parentName) {
      parts.push(`Parent: ${entry.parentName}`);
    }

    if (entry.rawComment) {
      parts.push(`Existing comment:\n${entry.rawComment}`);
    }

    if (context.relatedSignatures.length > 0) {
      parts.push(`Related signatures:\n${context.relatedSignatures.map(s => `- ${s}`).join('\n')}`);
    }

    if (context.moduleSummary) {
      parts.push(`Module context: ${context.moduleSummary}`);
    }

    if (context.siblingNames.length > 0) {
      parts.push(`Other entries in scope: ${context.siblingNames.join(', ')}`);
    }

    return parts.join('\n\n');
  }
}
