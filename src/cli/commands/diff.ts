import path from 'path';
import ora from 'ora';
import type { SupportedLanguage } from '../../shared/types.js';
import { loadConfig } from '../../shared/config.js';
import { DocGenEngineImpl } from '../../core/engine.js';
import { createSnapshot, loadSnapshot, computeDiff } from '../../core/snapshot.js';
import { formatDiffResult } from '../formatters.js';
import { errorAndExit } from '../utils.js';

interface DiffOptions {
  snapshot?: string;
  language?: string[];
  include?: string[];
  exclude?: string[];
  json?: boolean;
  exitCode?: boolean;
  config?: string;
}

export async function diffCommand(dir: string, options: DiffOptions): Promise<void> {
  const rootDir = path.resolve(dir || '.');
  const snapshotPath = path.resolve(options.snapshot || '.arbor-snapshot.json');

  try {
    // Load baseline snapshot
    let baseline;
    try {
      baseline = await loadSnapshot(snapshotPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        errorAndExit(`Snapshot not found at ${snapshotPath}. Run \`arbor scan --snapshot\` first.`);
      }
      throw error;
    }

    const config = await loadConfig({
      rootDir,
      languages: options.language as SupportedLanguage[] | undefined,
      include: options.include,
      exclude: options.exclude,
      enrich: false,
    });

    const spinner = options.json ? null : ora('Scanning current state...').start();

    const engine = new DocGenEngineImpl();
    const scanResult = await engine.scan(config);

    if (spinner) spinner.succeed(`Scanned ${scanResult.files.length} files`);

    const current = createSnapshot(scanResult, rootDir);
    const diff = computeDiff(baseline, current);

    if (options.json) {
      console.log(JSON.stringify(diff, null, 2));
    } else {
      console.log(formatDiffResult(diff));

      const totalChanges = diff.summary.totalAdded + diff.summary.totalRemoved + diff.summary.totalModified;
      if (totalChanges === 0) {
        console.log('\n  No changes detected.\n');
      }
    }

    if (options.exitCode) {
      const totalChanges = diff.summary.totalAdded + diff.summary.totalRemoved + diff.summary.totalModified;
      if (totalChanges > 0) {
        process.exit(1);
      }
    }
  } catch (error) {
    errorAndExit((error as Error).message);
  }
}
