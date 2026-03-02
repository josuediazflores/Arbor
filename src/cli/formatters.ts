import chalk from 'chalk';
import path from 'path';
import type { ScanStats, GenerateResult, DiffResult } from '../shared/types.js';
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

export function formatDiffResult(diff: DiffResult): string {
  const lines: string[] = [];
  const { summary } = diff;

  lines.push(chalk.bold('\nDocumentation Diff'));
  lines.push(chalk.dim('─'.repeat(40)));
  lines.push(`  Added:     ${chalk.green(summary.totalAdded)} ${summary.totalAdded === 1 ? 'entry' : 'entries'}`);
  lines.push(`  Removed:   ${chalk.red(summary.totalRemoved)} ${summary.totalRemoved === 1 ? 'entry' : 'entries'}`);
  lines.push(`  Modified:  ${chalk.yellow(summary.totalModified)} ${summary.totalModified === 1 ? 'entry' : 'entries'}`);

  const coverageDelta = summary.coverageAfter - summary.coverageBefore;
  const deltaStr = coverageDelta > 0 ? `+${coverageDelta}%` : `${coverageDelta}%`;
  const deltaColor = coverageDelta > 0 ? chalk.green : coverageDelta < 0 ? chalk.red : chalk.dim;
  lines.push(`  Coverage:  ${summary.coverageBefore}% → ${summary.coverageAfter}% (${deltaColor(deltaStr)})`);

  if (diff.added.length + diff.removed.length + diff.modified.length > 0) {
    lines.push('');
  }

  for (const change of diff.added) {
    const relFile = extractRelFile(change.entry.key);
    lines.push(chalk.green(`  + ${change.entry.name} (${change.entry.kind}) in ${relFile}`));
  }

  for (const change of diff.removed) {
    const relFile = extractRelFile(change.entry.key);
    lines.push(chalk.red(`  - ${change.entry.name} (${change.entry.kind}) in ${relFile}`));
  }

  for (const change of diff.modified) {
    const relFile = extractRelFile(change.entry.key);
    const changeDescs = change.kinds
      .filter(k => k !== 'added' && k !== 'removed')
      .map(k => k.replace(/_/g, ' '));
    const suffix = changeDescs.length > 0 ? ` — ${changeDescs.join(', ')}` : '';
    lines.push(chalk.yellow(`  ~ ${change.entry.name} (${change.entry.kind}) in ${relFile}${suffix}`));
  }

  return lines.join('\n');
}

function extractRelFile(key: string): string {
  // Key format: "name:kind:relative/path" or "name:kind:relative/path:N"
  const parts = key.split(':');
  // The file path is parts[2] (and possibly more segments if path has colons, though unlikely)
  return parts.slice(2).join(':').replace(/:\d+$/, '');
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
