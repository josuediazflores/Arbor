import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import type { SupportedLanguage } from '../../shared/types.js';
import { loadConfig } from '../../shared/config.js';
import { DocGenEngineImpl } from '../../core/engine.js';
import { formatGenerateResult } from '../formatters.js';
import { errorAndExit, warnMessage } from '../utils.js';

interface GenerateOptions {
  output?: string;
  noAi?: boolean;
  language?: string[];
  include?: string[];
  exclude?: string[];
  config?: string;
  title?: string;
}

export async function generateCommand(dir: string, options: GenerateOptions): Promise<void> {
  const rootDir = path.resolve(dir || '.');

  try {
    const config = await loadConfig({
      rootDir,
      outputDir: options.output ? path.resolve(options.output) : undefined,
      languages: options.language as SupportedLanguage[] | undefined,
      include: options.include,
      exclude: options.exclude,
      enrich: !options.noAi,
      title: options.title,
    });

    if (config.enrich && !config.anthropicApiKey) {
      warnMessage('No ANTHROPIC_API_KEY found. Running without AI enrichment.');
      config.enrich = false;
    }

    // Phase 1: Scan
    const scanSpinner = ora('Scanning files...').start();
    let fileCount = 0;

    const engine = new DocGenEngineImpl({
      onScanFile: () => {
        fileCount++;
        scanSpinner.text = `Scanning files... (${fileCount})`;
      },
      onEnrichProgress: (completed, total) => {
        scanSpinner.text = `Enriching documentation... (${completed}/${total})`;
      },
      onRenderFile: (file) => {
        scanSpinner.text = `Writing ${path.basename(file)}...`;
      },
    });

    const scanResult = await engine.scan(config);
    scanSpinner.succeed(`Scanned ${scanResult.files.length} files, found ${scanResult.entries.length} entries`);

    if (scanResult.entries.length === 0) {
      console.log(chalk.yellow('No entries found. Check your language and include/exclude settings.'));
      return;
    }

    // Phase 2: Generate (includes enrichment if enabled)
    const genSpinner = ora(config.enrich ? 'Enriching and generating docs...' : 'Generating docs...').start();
    const result = await engine.generate(scanResult, config);
    genSpinner.succeed('Documentation generated!');

    console.log(formatGenerateResult(result));
  } catch (error) {
    errorAndExit((error as Error).message);
  }
}
