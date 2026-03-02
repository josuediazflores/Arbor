import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import type { SupportedLanguage } from '../../shared/types.js';
import { LANGUAGE_EXTENSIONS } from '../../shared/constants.js';

export async function initCommand(options: { dir?: string }): Promise<void> {
  const rootDir = path.resolve(options.dir || '.');
  const configPath = path.join(rootDir, 'docgen.yaml');

  // Check if config already exists
  try {
    await fs.access(configPath);
    console.log(chalk.yellow('docgen.yaml already exists. Skipping.'));
    return;
  } catch {
    // File doesn't exist, continue
  }

  // Detect languages
  const detectedLanguages: SupportedLanguage[] = [];
  for (const [lang, exts] of Object.entries(LANGUAGE_EXTENSIONS)) {
    for (const ext of exts) {
      const matches = await glob(`**/*${ext}`, {
        cwd: rootDir,
        ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/.git/**'],
        nodir: true,
      });
      if (matches.length > 0) {
        detectedLanguages.push(lang as SupportedLanguage);
        break;
      }
    }
  }

  const config = `# DocGen Configuration
# Generated automatically

# Languages to scan
languages:
${detectedLanguages.map(l => `  - ${l}`).join('\n') || '  - c\n  - cpp'}

# Output directory for generated docs
outputDir: ./docs

# File patterns to include/exclude
include:
  - "**/*"
exclude:
  - "**/node_modules/**"
  - "**/build/**"
  - "**/dist/**"
  - "**/.git/**"
  - "**/vendor/**"

# AI enrichment settings
enrich: true
# model: claude-sonnet-4-5-20250929
# concurrency: 5
# skipDocumented: false

# Documentation title
title: API Documentation
`;

  await fs.writeFile(configPath, config, 'utf-8');
  console.log(chalk.green(`Created ${configPath}`));

  if (detectedLanguages.length > 0) {
    console.log(chalk.dim(`Detected languages: ${detectedLanguages.join(', ')}`));
  } else {
    console.log(chalk.dim('No source files detected. Edit docgen.yaml to configure languages.'));
  }
}
