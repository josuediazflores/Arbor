import path from 'path';
import type { SupportedLanguage } from '../../shared/types.js';
import { loadConfig } from '../../shared/config.js';
import { DocGenEngineImpl } from '../../core/engine.js';

export async function getDocEntries(rootDir: string) {
  const config = await loadConfig({
    rootDir: path.resolve(rootDir),
    enrich: false,
  });

  const engine = new DocGenEngineImpl();
  const result = await engine.scan(config);

  return result.entries;
}
