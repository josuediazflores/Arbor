import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import type { ScanResult, ScanStats, Snapshot, SnapshotEntry } from '../../src/shared/types.js';
import { createSnapshot, saveSnapshot, loadSnapshot, computeDiff } from '../../src/core/snapshot.js';

function makeScanStats(overrides: Partial<ScanStats> = {}): ScanStats {
  return {
    totalFiles: 1,
    totalEntries: 0,
    byLanguage: { c: 0, cpp: 0, kotlin: 0, swift: 0 },
    byKind: {},
    documentedCount: 0,
    undocumentedCount: 0,
    ...overrides,
  };
}

function makeScanResult(entries: ScanResult['entries']): ScanResult {
  return {
    entries,
    stats: makeScanStats({ totalEntries: entries.length }),
    files: ['/project/src/test.swift'],
  };
}

function makeEntry(name: string, kind: string, file: string, extras: Record<string, any> = {}) {
  return {
    name,
    kind: kind as any,
    language: 'swift' as const,
    signature: `func ${name}()`,
    description: extras.description,
    params: extras.params || [],
    returnType: undefined,
    throws: [],
    examples: [],
    location: { file, line: 1, column: 0 },
    rawComment: extras.rawComment,
    visibility: extras.visibility,
    parentName: extras.parentName,
  };
}

function makeSnapshotEntry(key: string, overrides: Partial<SnapshotEntry> = {}): SnapshotEntry {
  return {
    key,
    name: 'test',
    kind: 'function',
    language: 'swift',
    signature: 'func test()',
    documented: false,
    paramCount: 0,
    ...overrides,
  };
}

function makeSnapshot(entries: Record<string, SnapshotEntry>, overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    rootDir: '/project',
    entries,
    stats: makeScanStats({ totalEntries: Object.keys(entries).length }),
    ...overrides,
  };
}

describe('createSnapshot', () => {
  it('produces correct keys with relative paths', () => {
    const scanResult = makeScanResult([
      makeEntry('doStuff', 'function', '/project/src/utils.swift'),
      makeEntry('MyClass', 'class', '/project/src/models/thing.swift'),
    ]);

    const snapshot = createSnapshot(scanResult, '/project');

    expect(snapshot.version).toBe(1);
    expect(snapshot.rootDir).toBe('/project');
    expect(snapshot.entries['doStuff:function:src/utils.swift']).toBeDefined();
    expect(snapshot.entries['MyClass:class:src/models/thing.swift']).toBeDefined();
    expect(snapshot.entries['doStuff:function:src/utils.swift'].name).toBe('doStuff');
  });

  it('handles duplicate keys by appending counter', () => {
    const scanResult = makeScanResult([
      makeEntry('init', 'constructor', '/project/src/a.swift'),
      makeEntry('init', 'constructor', '/project/src/a.swift'),
    ]);

    const snapshot = createSnapshot(scanResult, '/project');
    const keys = Object.keys(snapshot.entries);

    expect(keys).toContain('init:constructor:src/a.swift');
    expect(keys).toContain('init:constructor:src/a.swift:2');
  });

  it('sets documented flag based on description or rawComment', () => {
    const scanResult = makeScanResult([
      makeEntry('withDesc', 'function', '/project/src/a.swift', { description: 'does stuff' }),
      makeEntry('withComment', 'function', '/project/src/b.swift', { rawComment: '/// comment' }),
      makeEntry('noDoc', 'function', '/project/src/c.swift'),
    ]);

    const snapshot = createSnapshot(scanResult, '/project');

    expect(snapshot.entries['withDesc:function:src/a.swift'].documented).toBe(true);
    expect(snapshot.entries['withComment:function:src/b.swift'].documented).toBe(true);
    expect(snapshot.entries['noDoc:function:src/c.swift'].documented).toBe(false);
  });
});

describe('saveSnapshot / loadSnapshot', () => {
  it('roundtrips correctly', async () => {
    const original = makeSnapshot({
      'test:function:src/a.swift': makeSnapshotEntry('test:function:src/a.swift', {
        name: 'test',
        documented: true,
        paramCount: 2,
      }),
    });

    const tmpPath = path.join(os.tmpdir(), `snapshot-test-${Date.now()}.json`);
    try {
      await saveSnapshot(original, tmpPath);
      const loaded = await loadSnapshot(tmpPath);

      expect(loaded.version).toBe(1);
      expect(loaded.rootDir).toBe(original.rootDir);
      expect(Object.keys(loaded.entries)).toHaveLength(1);
      expect(loaded.entries['test:function:src/a.swift'].name).toBe('test');
      expect(loaded.entries['test:function:src/a.swift'].documented).toBe(true);
      expect(loaded.entries['test:function:src/a.swift'].paramCount).toBe(2);
    } finally {
      await fs.rm(tmpPath, { force: true });
    }
  });

  it('rejects invalid version', async () => {
    const tmpPath = path.join(os.tmpdir(), `snapshot-bad-${Date.now()}.json`);
    try {
      await fs.writeFile(tmpPath, JSON.stringify({ version: 99, entries: {} }), 'utf-8');
      await expect(loadSnapshot(tmpPath)).rejects.toThrow('Unsupported snapshot version: 99');
    } finally {
      await fs.rm(tmpPath, { force: true });
    }
  });
});

describe('computeDiff', () => {
  it('detects additions', () => {
    const baseline = makeSnapshot({});
    const current = makeSnapshot({
      'foo:function:src/a.swift': makeSnapshotEntry('foo:function:src/a.swift', { name: 'foo' }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].entry.name).toBe('foo');
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.summary.totalAdded).toBe(1);
  });

  it('detects removals', () => {
    const baseline = makeSnapshot({
      'bar:function:src/b.swift': makeSnapshotEntry('bar:function:src/b.swift', { name: 'bar' }),
    });
    const current = makeSnapshot({});

    const diff = computeDiff(baseline, current);

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].entry.name).toBe('bar');
    expect(diff.summary.totalRemoved).toBe(1);
  });

  it('detects signature changes', () => {
    const baseline = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { signature: 'func f()' }),
    });
    const current = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { signature: 'func f(x: Int)' }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].kinds).toContain('signature_changed');
  });

  it('detects doc added', () => {
    const baseline = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { documented: false }),
    });
    const current = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { documented: true }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].kinds).toContain('doc_added');
  });

  it('detects doc removed', () => {
    const baseline = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { documented: true }),
    });
    const current = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { documented: false }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].kinds).toContain('doc_removed');
  });

  it('detects param changes', () => {
    const baseline = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { paramCount: 1 }),
    });
    const current = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { paramCount: 3 }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].kinds).toContain('params_changed');
  });

  it('detects visibility changes', () => {
    const baseline = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { visibility: 'private' }),
    });
    const current = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', { visibility: 'public' }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].kinds).toContain('visibility_changed');
  });

  it('collects multiple change kinds on one entry', () => {
    const baseline = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', {
        signature: 'func f()',
        documented: false,
        paramCount: 0,
      }),
    });
    const current = makeSnapshot({
      'f:function:a.swift': makeSnapshotEntry('f:function:a.swift', {
        signature: 'func f(x: Int)',
        documented: true,
        paramCount: 1,
      }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].kinds).toContain('signature_changed');
    expect(diff.modified[0].kinds).toContain('doc_added');
    expect(diff.modified[0].kinds).toContain('params_changed');
    expect(diff.modified[0].previous).toBeDefined();
  });

  it('returns empty diff when no changes', () => {
    const entry = makeSnapshotEntry('f:function:a.swift', { name: 'f' });
    const baseline = makeSnapshot({ 'f:function:a.swift': entry });
    const current = makeSnapshot({ 'f:function:a.swift': { ...entry } });

    const diff = computeDiff(baseline, current);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
  });

  it('computes coverage summary percentages correctly', () => {
    const baseline = makeSnapshot({
      'a:function:a.swift': makeSnapshotEntry('a:function:a.swift', { documented: true }),
      'b:function:b.swift': makeSnapshotEntry('b:function:b.swift', { documented: false }),
    });
    const current = makeSnapshot({
      'a:function:a.swift': makeSnapshotEntry('a:function:a.swift', { documented: true }),
      'b:function:b.swift': makeSnapshotEntry('b:function:b.swift', { documented: true }),
      'c:function:c.swift': makeSnapshotEntry('c:function:c.swift', { documented: true }),
    });

    const diff = computeDiff(baseline, current);

    expect(diff.summary.coverageBefore).toBe(50); // 1/2
    expect(diff.summary.coverageAfter).toBe(100); // 3/3
  });
});
