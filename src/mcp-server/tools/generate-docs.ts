import path from 'path';
import type { SupportedLanguage } from '../../shared/types.js';
import { loadConfig } from '../../shared/config.js';
import { DocGenEngineImpl } from '../../core/engine.js';

export interface GenerateDocsInput {
  rootDir: string;
  outputDir?: string;
  enrich?: boolean;
  languages?: SupportedLanguage[];
}

export async function generateDocs(input: GenerateDocsInput) {
  const config = await loadConfig({
    rootDir: path.resolve(input.rootDir),
    outputDir: input.outputDir ? path.resolve(input.outputDir) : undefined,
    enrich: input.enrich ?? false,
  });

  const engine = new DocGenEngineImpl();
  const scanResult = await engine.scan(config);
  const result = await engine.generate(scanResult, config);

  return {
    outputDir: result.outputDir,
    filesWritten: result.filesWritten,
    totalEntries: result.totalEntries,
    enrichedCount: result.enrichedCount,
  };
}
