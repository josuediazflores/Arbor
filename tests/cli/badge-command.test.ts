import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { DocGenEngineImpl } from '../../src/core/engine.js';
import { getDefaultConfig } from '../../src/shared/config.js';
import { coverageColor, generateBadgeSvg } from '../../src/core/badge.js';

describe('badge command workflow', () => {
  const fixturesDir = path.join(import.meta.dirname, '../fixtures');

  it('generates SVG file at default path', async () => {
    const engine = new DocGenEngineImpl();
    const config = {
      ...getDefaultConfig(),
      rootDir: fixturesDir,
      languages: ['c', 'cpp', 'kotlin', 'swift'] as const,
      enrich: false,
    };

    const result = await engine.scan(config as any);
    const { totalEntries, documentedCount } = result.stats;
    const coverage = totalEntries > 0
      ? Math.round((documentedCount / totalEntries) * 100)
      : 0;

    const svg = generateBadgeSvg({
      value: `${coverage}%`,
      color: coverageColor(coverage),
    });

    const outputPath = path.join(os.tmpdir(), `badge-test-${Date.now()}.svg`);
    try {
      await fs.writeFile(outputPath, svg, 'utf-8');
      const content = await fs.readFile(outputPath, 'utf-8');

      expect(content.trimStart()).toMatch(/^<svg/);
      expect(content.trimEnd()).toMatch(/<\/svg>$/);
    } finally {
      await fs.rm(outputPath, { force: true });
    }
  });

  it('custom output path works', async () => {
    const customPath = path.join(os.tmpdir(), `custom-badge-${Date.now()}.svg`);
    const svg = generateBadgeSvg({ value: '42%', color: coverageColor(42) });

    try {
      await fs.writeFile(customPath, svg, 'utf-8');
      const exists = await fs.stat(customPath);
      expect(exists.isFile()).toBe(true);
    } finally {
      await fs.rm(customPath, { force: true });
    }
  });

  it('SVG content reflects actual coverage percentage', async () => {
    const engine = new DocGenEngineImpl();
    const config = {
      ...getDefaultConfig(),
      rootDir: fixturesDir,
      languages: ['c', 'cpp', 'kotlin', 'swift'] as const,
      enrich: false,
    };

    const result = await engine.scan(config as any);
    const { totalEntries, documentedCount } = result.stats;
    const coverage = totalEntries > 0
      ? Math.round((documentedCount / totalEntries) * 100)
      : 0;

    const svg = generateBadgeSvg({
      value: `${coverage}%`,
      color: coverageColor(coverage),
    });

    expect(svg).toContain(`${coverage}%`);
  });
});
