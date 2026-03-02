import type { DocEntry } from '../../shared/types.js';
import type { EnrichmentOptions, EnrichmentResult } from './types.js';
import type { EnrichmentContext } from '../analyzer/context-builder.js';
import { AnthropicClient } from './anthropic-client.js';
import { PromptBuilder } from './prompt-builder.js';
import { parseEnrichmentResponse } from './response-parser.js';
import { EnrichmentError } from '../../shared/errors.js';

export class EnrichmentPipeline {
  private client: AnthropicClient;
  private promptBuilder = new PromptBuilder();

  constructor(apiKey: string) {
    this.client = new AnthropicClient(apiKey);
  }

  async enrichAll(
    contexts: EnrichmentContext[],
    options: EnrichmentOptions = {},
  ): Promise<DocEntry[]> {
    const {
      model = 'claude-sonnet-4-5-20250929',
      concurrency = 5,
      skipDocumented = false,
      onProgress,
    } = options;

    const toEnrich = skipDocumented
      ? contexts.filter(ctx => !ctx.entry.description)
      : contexts;

    const results: DocEntry[] = [];
    let completed = 0;

    // Semaphore-based concurrency control
    const semaphore = new Semaphore(concurrency);

    const promises = toEnrich.map(async (ctx) => {
      await semaphore.acquire();
      try {
        const enriched = await this.enrichEntry(ctx, model);
        results.push(enriched);
      } catch (error) {
        // On failure, keep the original entry
        results.push(ctx.entry);
      } finally {
        completed++;
        onProgress?.(completed, toEnrich.length);
        semaphore.release();
      }
    });

    await Promise.all(promises);

    // Add entries that were skipped
    if (skipDocumented) {
      const enrichedNames = new Set(results.map(e => `${e.name}:${e.location.file}:${e.location.line}`));
      for (const ctx of contexts) {
        const key = `${ctx.entry.name}:${ctx.entry.location.file}:${ctx.entry.location.line}`;
        if (!enrichedNames.has(key)) {
          results.push(ctx.entry);
        }
      }
    }

    return results;
  }

  private async enrichEntry(
    ctx: EnrichmentContext,
    model: string,
    retries = 3,
  ): Promise<DocEntry> {
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildUserPrompt(ctx.entry, {
      relatedSignatures: ctx.relatedSignatures,
      moduleSummary: ctx.moduleSummary,
      siblingNames: ctx.siblingNames,
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.client.createMessage(
          systemPrompt,
          [{ role: 'user', content: userPrompt }],
          model,
        );

        const result = parseEnrichmentResponse(response);
        if (!result) {
          throw new EnrichmentError('Failed to parse AI response', ctx.entry.name);
        }

        return this.applyEnrichment(ctx.entry, result);
      } catch (error) {
        lastError = error as Error;

        // Retry on rate limit or server errors
        if (error instanceof EnrichmentError && error.message.includes('429')) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        if (error instanceof EnrichmentError && error.message.includes('5')) {
          await this.delay(Math.pow(2, attempt) * 500);
          continue;
        }

        // Don't retry on other errors
        break;
      }
    }

    throw lastError || new EnrichmentError('Unknown error', ctx.entry.name);
  }

  private applyEnrichment(entry: DocEntry, result: EnrichmentResult): DocEntry {
    const enriched = { ...entry };

    if (result.description) {
      enriched.description = result.description;
    }

    if (result.paramDescriptions) {
      enriched.params = enriched.params.map(p => ({
        ...p,
        description: result.paramDescriptions?.[p.name] || p.description,
      }));
    }

    if (result.returnDescription && enriched.returnType) {
      enriched.returnType = {
        ...enriched.returnType,
        description: result.returnDescription,
      };
    }

    if (result.examples && result.examples.length > 0) {
      enriched.examples = result.examples.map(e => ({
        code: e.code,
        language: entry.language,
        description: e.description,
      }));
    }

    if (result.edgeCases) {
      enriched.edgeCases = result.edgeCases;
    }

    if (result.related) {
      enriched.related = result.related;
    }

    if (result.tags) {
      enriched.tags = result.tags;
    }

    return enriched;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class Semaphore {
  private count: number;
  private waiting: Array<() => void> = [];

  constructor(count: number) {
    this.count = count;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }
    return new Promise<void>(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.count++;
    }
  }
}
