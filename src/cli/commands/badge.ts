import path from 'path';
import fs from 'fs/promises';
import ora from 'ora';
import chalk from 'chalk';
import type { SupportedLanguage } from '../../shared/types.js';
import { loadConfig } from '../../shared/config.js';
import { DocGenEngineImpl } from '../../core/engine.js';
import { coverageColor, generateBadgeSvg } from '../../core/badge.js';
import type { BadgeStyle } from '../../core/badge.js';
import { errorAndExit } from '../utils.js';

interface BadgeOptions {
  output?: string;
  label?: string;
  style?: BadgeStyle;
  language?: string[];
  include?: string[];
  exclude?: string[];
  config?: string;
}

export async function badgeCommand(dir: string, options: BadgeOptions): Promise<void> {
  const rootDir = path.resolve(dir || '.');
  const outputPath = path.resolve(options.output || 'coverage-badge.svg');

  try {
    const config = await loadConfig({
      rootDir,
      languages: options.language as SupportedLanguage[] | undefined,
      include: options.include,
      exclude: options.exclude,
      enrich: false,
    });

    const spinner = ora('Scanning files...').start();

    const engine = new DocGenEngineImpl();
    const scanResult = await engine.scan(config);

    spinner.succeed(`Scanned ${scanResult.files.length} files`);

    const { totalEntries, documentedCount } = scanResult.stats;
    const coverage = totalEntries > 0
      ? Math.round((documentedCount / totalEntries) * 100)
      : 0;

    const svg = generateBadgeSvg({
      label: options.label,
      value: `${coverage}%`,
      color: coverageColor(coverage),
      style: options.style,
    });

    await fs.writeFile(outputPath, svg, 'utf-8');

    console.log(chalk.green(`\nBadge written to ${outputPath}`));
    console.log(`  Coverage: ${coverage}% (${documentedCount}/${totalEntries} documented)\n`);
  } catch (error) {
    errorAndExit((error as Error).message);
  }
}
