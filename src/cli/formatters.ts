import chalk from 'chalk';
import type { ScanStats, GenerateResult } from '../shared/types.js';
import { LANGUAGE_NAMES } from '../shared/constants.js';

export function formatScanStats(stats: ScanStats): string {
  const lines: string[] = [];

  lines.push(chalk.bold('\nScan Results'));
  lines.push(chalk.dim('─'.repeat(40)));
  lines.push(`  Files scanned:  ${chalk.cyan(stats.totalFiles)}`);
  lines.push(`  Total entries:  ${chalk.cyan(stats.totalEntries)}`);
  lines.push(`  Documented:     ${chalk.green(stats.documentedCount)}`);
  lines.push(`  Undocumented:   ${chalk.yellow(stats.undocumentedCount)}`);

  const coverage = stats.totalEntries > 0
    ? Math.round((stats.documentedCount / stats.totalEntries) * 100)
    : 0;
  const colorFn = coverage >= 80 ? chalk.green : coverage >= 50 ? chalk.yellow : chalk.red;
  lines.push(`  Coverage:       ${colorFn(coverage + '%')}`);

  lines.push('');
  lines.push(chalk.bold('  By Language:'));
  for (const [lang, count] of Object.entries(stats.byLanguage)) {
    if (count > 0) {
      const langName = LANGUAGE_NAMES[lang as keyof typeof LANGUAGE_NAMES] || lang;
      lines.push(`    ${langName.padEnd(10)} ${chalk.cyan(count)}`);
    }
  }

  lines.push('');
  lines.push(chalk.bold('  By Kind:'));
  for (const [kind, count] of Object.entries(stats.byKind)) {
    if (count > 0) {
      lines.push(`    ${kind.padEnd(14)} ${chalk.cyan(count)}`);
    }
  }

  return lines.join('\n');
}

export function formatGenerateResult(result: GenerateResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold.green('\nDocumentation generated successfully!'));
  lines.push(chalk.dim('─'.repeat(40)));
  lines.push(`  Output:         ${chalk.cyan(result.outputDir)}`);
  lines.push(`  Files written:  ${chalk.cyan(result.filesWritten.length)}`);
  lines.push(`  Total entries:  ${chalk.cyan(result.totalEntries)}`);
  lines.push(`  Enriched:       ${chalk.cyan(result.enrichedCount)}`);

  return lines.join('\n');
}
