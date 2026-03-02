#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { generateCommand } from './commands/generate.js';
import { diffCommand } from './commands/diff.js';
import { badgeCommand } from './commands/badge.js';

const program = new Command();

program
  .name('arbor')
  .description('AI-powered SDK documentation generator')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a docgen.yaml configuration file')
  .option('-d, --dir <path>', 'Target directory', '.')
  .action(initCommand);

program
  .command('scan [dir]')
  .description('Scan source files and display extraction statistics')
  .option('-l, --language <langs...>', 'Languages to scan (c, cpp, kotlin, swift)')
  .option('-i, --include <patterns...>', 'File include patterns')
  .option('-e, --exclude <patterns...>', 'File exclude patterns')
  .option('--json', 'Output as JSON')
  .option('-c, --config <path>', 'Path to config file')
  .option('-s, --snapshot [path]', 'Save snapshot for diff comparison')
  .action(scanCommand);

program
  .command('generate [dir]')
  .description('Generate documentation from source files')
  .option('-o, --output <dir>', 'Output directory')
  .option('--no-ai', 'Skip AI enrichment')
  .option('-l, --language <langs...>', 'Languages to scan')
  .option('-i, --include <patterns...>', 'File include patterns')
  .option('-e, --exclude <patterns...>', 'File exclude patterns')
  .option('-c, --config <path>', 'Path to config file')
  .option('-t, --title <title>', 'Documentation title')
  .action(generateCommand);

program
  .command('diff [dir]')
  .description('Compare current docs against a saved baseline snapshot')
  .option('-s, --snapshot <path>', 'Path to baseline snapshot', '.arbor-snapshot.json')
  .option('-l, --language <langs...>', 'Languages to scan')
  .option('-i, --include <patterns...>', 'File include patterns')
  .option('-e, --exclude <patterns...>', 'File exclude patterns')
  .option('--json', 'Output as JSON')
  .option('--exit-code', 'Exit with code 1 if changes detected')
  .option('-c, --config <path>', 'Path to config file')
  .action(diffCommand);

program
  .command('badge [dir]')
  .description('Generate an SVG documentation coverage badge')
  .option('-o, --output <path>', 'Output SVG path', 'coverage-badge.svg')
  .option('--label <text>', 'Badge label text', 'docs')
  .option('--style <style>', 'Badge style (flat, flat-square, plastic)', 'flat')
  .option('-l, --language <langs...>', 'Languages to scan')
  .option('-i, --include <patterns...>', 'File include patterns')
  .option('-e, --exclude <patterns...>', 'File exclude patterns')
  .option('-c, --config <path>', 'Path to config file')
  .action(badgeCommand);

program.parse();
