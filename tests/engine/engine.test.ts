import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { DocGenEngineImpl } from '../../src/core/engine.js';
import { getDefaultConfig } from '../../src/shared/config.js';

describe('DocGenEngine', () => {
  const fixturesDir = path.join(import.meta.dirname, '../fixtures');

  it('scans fixture files and extracts entries', async () => {
    const engine = new DocGenEngineImpl();
    const config = {
      ...getDefaultConfig(),
      rootDir: fixturesDir,
      languages: ['c', 'cpp', 'kotlin', 'swift'] as const,
      enrich: false,
    };

    const result = await engine.scan(config as any);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.stats.totalFiles).toBeGreaterThan(0);
    expect(result.stats.totalEntries).toBeGreaterThan(0);

    // Should have entries from multiple languages
    expect(result.stats.byLanguage.c).toBeGreaterThan(0);
    expect(result.stats.byLanguage.swift).toBeGreaterThan(0);
    expect(result.stats.byLanguage.kotlin).toBeGreaterThan(0);
  });

  it('generates markdown docs without AI', async () => {
    const engine = new DocGenEngineImpl();
    const outputDir = path.join(os.tmpdir(), `docgen-test-${Date.now()}`);

    const config = {
      ...getDefaultConfig(),
      rootDir: fixturesDir,
      outputDir,
      languages: ['c', 'cpp', 'kotlin', 'swift'] as const,
      enrich: false,
    };

    const scanResult = await engine.scan(config as any);
    const result = await engine.generate(scanResult, config as any);

    expect(result.filesWritten.length).toBeGreaterThan(0);
    expect(result.totalEntries).toBeGreaterThan(0);

    // Verify index.md exists
    const indexPath = path.join(outputDir, 'index.md');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    expect(indexContent).toContain('API Documentation');

    // Clean up
    await fs.rm(outputDir, { recursive: true, force: true });
  });
});
