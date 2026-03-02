import path from 'path';
import ora from 'ora';
import type { SupportedLanguage } from '../../shared/types.js';
import { loadConfig } from '../../shared/config.js';
import { DocGenEngineImpl } from '../../core/engine.js';
import { formatScanStats } from '../formatters.js';
import { errorAndExit } from '../utils.js';

interface ScanOptions {
  language?: string[];
  include?: string[];
  exclude?: string[];
  json?: boolean;
  config?: string;
}

export async function scanCommand(dir: string, options: ScanOptions): Promise<void> {
  const rootDir = path.resolve(dir || '.');

  try {
    const config = await loadConfig({
      rootDir,
      languages: options.language as SupportedLanguage[] | undefined,
      include: options.include,
      exclude: options.exclude,
      enrich: false,
    });

    const spinner = options.json ? null : ora('Scanning files...').start();
    let fileCount = 0;

    const engine = new DocGenEngineImpl({
      onScanFile: () => {
        fileCount++;
        if (spinner) spinner.text = `Scanning files... (${fileCount})`;
      },
    });

    const result = await engine.scan(config);

    if (spinner) spinner.succeed(`Scanned ${result.files.length} files`);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatScanStats(result.stats));
    }
  } catch (error) {
    errorAndExit((error as Error).message);
  }
}
