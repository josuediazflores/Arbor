#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { generateCommand } from './commands/generate.js';

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

program.parse();
