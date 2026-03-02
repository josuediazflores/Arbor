import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { DocGenEngineImpl } from '../../src/core/engine.js';
import { getDefaultConfig } from '../../src/shared/config.js';
import { createSnapshot, saveSnapshot, loadSnapshot, computeDiff } from '../../src/core/snapshot.js';

describe('diff command workflow', () => {
  const fixturesDir = path.join(import.meta.dirname, '../fixtures');

  it('scan → save snapshot → diff → no changes', async () => {
    const engine = new DocGenEngineImpl();
    const config = {
      ...getDefaultConfig(),
      rootDir: fixturesDir,
      languages: ['c', 'cpp', 'kotlin', 'swift'] as const,
      enrich: false,
    };

    const result = await engine.scan(config as any);
    const snapshot = createSnapshot(result, fixturesDir);

    const tmpPath = path.join(os.tmpdir(), `diff-test-${Date.now()}.json`);
    try {
      await saveSnapshot(snapshot, tmpPath);
      const baseline = await loadSnapshot(tmpPath);

      // Scan again — same state
      const result2 = await engine.scan(config as any);
      const current = createSnapshot(result2, fixturesDir);
      const diff = computeDiff(baseline, current);

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
    } finally {
      await fs.rm(tmpPath, { force: true });
    }
  });

  it('modified snapshot → diff detects changes', async () => {
    const engine = new DocGenEngineImpl();
    const config = {
      ...getDefaultConfig(),
      rootDir: fixturesDir,
      languages: ['c', 'cpp', 'kotlin', 'swift'] as const,
      enrich: false,
    };

    const result = await engine.scan(config as any);
    const snapshot = createSnapshot(result, fixturesDir);

    // Tamper with baseline: remove first entry, change second
    const keys = Object.keys(snapshot.entries);
    expect(keys.length).toBeGreaterThan(2);

    const modifiedBaseline = { ...snapshot, entries: { ...snapshot.entries } };

    // Add a fake entry that won't exist in current scan
    modifiedBaseline.entries['fakeFunc:function:src/fake.swift'] = {
      key: 'fakeFunc:function:src/fake.swift',
      name: 'fakeFunc',
      kind: 'function',
      language: 'swift',
      signature: 'func fakeFunc()',
      documented: false,
      paramCount: 0,
    };

    // Remove first real entry (will show as "added" in current)
    const removedKey = keys[0];
    delete modifiedBaseline.entries[removedKey];

    // Change signature of second entry
    const changedKey = keys[1];
    modifiedBaseline.entries[changedKey] = {
      ...modifiedBaseline.entries[changedKey],
      signature: 'CHANGED_SIGNATURE',
    };

    const tmpPath = path.join(os.tmpdir(), `diff-test2-${Date.now()}.json`);
    try {
      await saveSnapshot(modifiedBaseline, tmpPath);
      const baseline = await loadSnapshot(tmpPath);

      const result2 = await engine.scan(config as any);
      const current = createSnapshot(result2, fixturesDir);
      const diff = computeDiff(baseline, current);

      expect(diff.added.length).toBeGreaterThanOrEqual(1); // The entry we removed from baseline
      expect(diff.removed.length).toBeGreaterThanOrEqual(1); // fakeFunc
      expect(diff.modified.length).toBeGreaterThanOrEqual(1); // signature change
    } finally {
      await fs.rm(tmpPath, { force: true });
    }
  });

  it('missing snapshot file throws ENOENT', async () => {
    await expect(loadSnapshot('/nonexistent/path.json')).rejects.toThrow();
  });

  it('--json style output is parseable', async () => {
    const engine = new DocGenEngineImpl();
    const config = {
      ...getDefaultConfig(),
      rootDir: fixturesDir,
      languages: ['c', 'cpp', 'kotlin', 'swift'] as const,
      enrich: false,
    };

    const result = await engine.scan(config as any);
    const snapshot = createSnapshot(result, fixturesDir);

    const diff = computeDiff(snapshot, snapshot);
    const json = JSON.stringify(diff, null, 2);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('added');
    expect(parsed).toHaveProperty('removed');
    expect(parsed).toHaveProperty('modified');
    expect(parsed).toHaveProperty('summary');
    expect(parsed.summary).toHaveProperty('totalAdded');
    expect(parsed.summary).toHaveProperty('coverageBefore');
    expect(parsed.summary).toHaveProperty('coverageAfter');
  });
});
