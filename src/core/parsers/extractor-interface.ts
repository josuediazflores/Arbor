import type { DocEntry, SupportedLanguage } from '../../shared/types.js';

export interface ExtractionContext {
  file: string;
  source: string;
  language: SupportedLanguage;
}

export interface ExtractionResult {
  entries: DocEntry[];
  errors: Array<{ message: string; line?: number }>;
}

export interface LanguageExtractor {
  readonly language: SupportedLanguage;
  readonly supportedExtensions: string[];
  extract(context: ExtractionContext): Promise<ExtractionResult>;
}
