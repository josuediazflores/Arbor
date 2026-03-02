import fs from 'fs/promises';
import path from 'path';
import type {
  ScanResult, Snapshot, SnapshotEntry, DiffResult, DiffChange, DiffChangeKind,
} from '../shared/types.js';
import { SnapshotSchema } from '../shared/schema.js';

export function createSnapshot(scanResult: ScanResult, rootDir: string): Snapshot {
  const entries: Record<string, SnapshotEntry> = {};
  const usedKeys = new Set<string>();

  for (const entry of scanResult.entries) {
    const relFile = path.relative(rootDir, entry.location.file);
    let baseKey = `${entry.name}:${entry.kind}:${relFile}`;
    let key = baseKey;
    let counter = 2;

    while (usedKeys.has(key)) {
      key = `${baseKey}:${counter}`;
      counter++;
    }

    usedKeys.add(key);

    entries[key] = {
      key,
      name: entry.name,
      kind: entry.kind,
      language: entry.language,
      signature: entry.signature,
      documented: !!(entry.description || entry.rawComment),
      paramCount: entry.params.length,
      visibility: entry.visibility,
      parentName: entry.parentName,
    };
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    rootDir,
    entries,
    stats: scanResult.stats,
  };
}

export async function saveSnapshot(snapshot: Snapshot, outputPath: string): Promise<void> {
  await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

export async function loadSnapshot(snapshotPath: string): Promise<Snapshot> {
  const raw = await fs.readFile(snapshotPath, 'utf-8');
  const data = JSON.parse(raw);

  if (data.version !== 1) {
    throw new Error(`Unsupported snapshot version: ${data.version}. Expected version 1.`);
  }

  const result = SnapshotSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid snapshot file: ${issues}`);
  }

  return result.data;
}

export function computeDiff(baseline: Snapshot, current: Snapshot): DiffResult {
  const added: DiffChange[] = [];
  const removed: DiffChange[] = [];
  const modified: DiffChange[] = [];

  const baselineKeys = new Set(Object.keys(baseline.entries));
  const currentKeys = new Set(Object.keys(current.entries));

  // Added: in current but not baseline
  for (const key of currentKeys) {
    if (!baselineKeys.has(key)) {
      added.push({ kinds: ['added'], entry: current.entries[key] });
    }
  }

  // Removed: in baseline but not current
  for (const key of baselineKeys) {
    if (!currentKeys.has(key)) {
      removed.push({ kinds: ['removed'], entry: baseline.entries[key] });
    }
  }

  // Modified: in both, check for changes
  for (const key of currentKeys) {
    if (!baselineKeys.has(key)) continue;

    const prev = baseline.entries[key];
    const curr = current.entries[key];
    const kinds: DiffChangeKind[] = [];

    if (prev.signature !== curr.signature) {
      kinds.push('signature_changed');
    }
    if (!prev.documented && curr.documented) {
      kinds.push('doc_added');
    }
    if (prev.documented && !curr.documented) {
      kinds.push('doc_removed');
    }
    if (prev.paramCount !== curr.paramCount) {
      kinds.push('params_changed');
    }
    if (prev.visibility !== curr.visibility) {
      kinds.push('visibility_changed');
    }

    if (kinds.length > 0) {
      modified.push({ kinds, entry: curr, previous: prev });
    }
  }

  const baselineEntryList = Object.values(baseline.entries);
  const currentEntryList = Object.values(current.entries);

  const totalBefore = baselineEntryList.length;
  const docBefore = baselineEntryList.filter(e => e.documented).length;
  const totalAfter = currentEntryList.length;
  const docAfter = currentEntryList.filter(e => e.documented).length;

  const coverageBefore = totalBefore > 0 ? Math.round((docBefore / totalBefore) * 100) : 0;
  const coverageAfter = totalAfter > 0 ? Math.round((docAfter / totalAfter) * 100) : 0;

  return {
    added,
    removed,
    modified,
    summary: {
      totalAdded: added.length,
      totalRemoved: removed.length,
      totalModified: modified.length,
      coverageBefore,
      coverageAfter,
    },
  };
}
