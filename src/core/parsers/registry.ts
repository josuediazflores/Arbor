import type { SupportedLanguage } from '../../shared/types.js';
import type { LanguageExtractor } from './extractor-interface.js';
import { EXTENSION_MAP } from '../../shared/constants.js';

export class ExtractorRegistry {
  private extractors = new Map<SupportedLanguage, LanguageExtractor>();

  register(extractor: LanguageExtractor): void {
    this.extractors.set(extractor.language, extractor);
  }

  getExtractor(language: SupportedLanguage): LanguageExtractor | undefined {
    return this.extractors.get(language);
  }

  getExtractorForFile(filePath: string): LanguageExtractor | undefined {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const language = EXTENSION_MAP[ext];
    if (!language) return undefined;

    // For .h files, try C++ first, then fall back to C
    if (ext === '.h') {
      const cppExtractor = this.extractors.get('cpp');
      if (cppExtractor) return cppExtractor;
    }

    return this.extractors.get(language);
  }

  getLanguageForFile(filePath: string): SupportedLanguage | undefined {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return EXTENSION_MAP[ext];
  }

  getRegisteredLanguages(): SupportedLanguage[] {
    return Array.from(this.extractors.keys());
  }
}
