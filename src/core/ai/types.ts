import type { DocEntry } from '../../shared/types.js';

export interface EnrichmentRequest {
  entry: DocEntry;
  context: EnrichmentRequestContext;
}

export interface EnrichmentRequestContext {
  relatedSignatures: string[];
  moduleSummary: string;
  siblingNames: string[];
}

export interface EnrichmentResult {
  description?: string;
  paramDescriptions?: Record<string, string>;
  returnDescription?: string;
  examples?: Array<{ code: string; description?: string }>;
  edgeCases?: string[];
  related?: string[];
  tags?: string[];
}

export interface EnrichmentOptions {
  model?: string;
  concurrency?: number;
  skipDocumented?: boolean;
  onProgress?: (completed: number, total: number) => void;
}
