import type { DocEntry } from '../../shared/types.js';
import path from 'path';

export interface ModuleGroup {
  name: string;
  file: string;
  entries: DocEntry[];
  classes: DocEntry[];
  functions: DocEntry[];
  enums: DocEntry[];
  others: DocEntry[];
}

export class ModuleGrouper {
  groupByFile(entries: DocEntry[]): ModuleGroup[] {
    const fileMap = new Map<string, DocEntry[]>();

    for (const entry of entries) {
      const file = entry.location.file;
      const existing = fileMap.get(file) || [];
      existing.push(entry);
      fileMap.set(file, existing);
    }

    const groups: ModuleGroup[] = [];
    for (const [file, fileEntries] of fileMap) {
      groups.push(this.createGroup(file, fileEntries));
    }

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  groupByNamespace(entries: DocEntry[]): ModuleGroup[] {
    const namespaceMap = new Map<string, DocEntry[]>();

    for (const entry of entries) {
      const ns = entry.parentName || path.basename(entry.location.file, path.extname(entry.location.file));
      const existing = namespaceMap.get(ns) || [];
      existing.push(entry);
      namespaceMap.set(ns, existing);
    }

    const groups: ModuleGroup[] = [];
    for (const [ns, nsEntries] of namespaceMap) {
      const file = nsEntries[0]?.location.file || '';
      groups.push(this.createGroup(file, nsEntries, ns));
    }

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  private createGroup(file: string, entries: DocEntry[], name?: string): ModuleGroup {
    const moduleName = name || path.basename(file, path.extname(file));

    return {
      name: moduleName,
      file,
      entries,
      classes: entries.filter(e =>
        e.kind === 'class' || e.kind === 'struct' || e.kind === 'protocol' || e.kind === 'object',
      ),
      functions: entries.filter(e =>
        e.kind === 'function' || e.kind === 'method' || e.kind === 'constructor' || e.kind === 'destructor',
      ),
      enums: entries.filter(e => e.kind === 'enum'),
      others: entries.filter(e =>
        e.kind === 'typedef' || e.kind === 'namespace' || e.kind === 'property' || e.kind === 'extension',
      ),
    };
  }
}
