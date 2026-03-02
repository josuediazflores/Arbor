import path from 'path';
import type { SupportedLanguage } from '../../shared/types.js';
import { loadConfig } from '../../shared/config.js';
import { DocGenEngineImpl } from '../../core/engine.js';

export interface ScanRepoInput {
  rootDir: string;
  languages?: SupportedLanguage[];
  include?: string[];
  exclude?: string[];
}

export async function scanRepo(input: ScanRepoInput) {
  const config = await loadConfig({
    rootDir: path.resolve(input.rootDir),
    languages: input.languages,
    include: input.include,
    exclude: input.exclude,
    enrich: false,
  });

  const engine = new DocGenEngineImpl();
  const result = await engine.scan(config);

  return {
    files: result.files,
    stats: result.stats,
    entries: result.entries.map(e => ({
      name: e.name,
      kind: e.kind,
      language: e.language,
      signature: e.signature,
      description: e.description,
      file: e.location.file,
      line: e.location.line,
      documented: !!e.description || !!e.rawComment,
    })),
  };
}
