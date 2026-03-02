import type { DocEntry } from '../../shared/types.js';
import { RelationshipAnalyzer, type RelationshipMap } from './relationship-analyzer.js';
import { ModuleGrouper } from './module-grouper.js';

export interface EnrichmentContext {
  entry: DocEntry;
  relatedSignatures: string[];
  moduleSummary: string;
  siblingNames: string[];
}

export class ContextBuilder {
  private analyzer = new RelationshipAnalyzer();
  private grouper = new ModuleGrouper();

  buildContexts(entries: DocEntry[]): EnrichmentContext[] {
    const relationshipMap = this.analyzer.analyze(entries);
    const groups = this.grouper.groupByFile(entries);

    return entries.map(entry => this.buildContext(entry, entries, relationshipMap, groups));
  }

  private buildContext(
    entry: DocEntry,
    allEntries: DocEntry[],
    relationshipMap: RelationshipMap,
    groups: ReturnType<ModuleGrouper['groupByFile']>,
  ): EnrichmentContext {
    // Find related signatures
    const relatedNames = this.analyzer.getRelatedEntries(entry, relationshipMap);
    const relatedSignatures = allEntries
      .filter(e => relatedNames.includes(e.name))
      .map(e => e.signature)
      .slice(0, 10); // Limit to keep prompts manageable

    // Build module summary
    const group = groups.find(g => g.file === entry.location.file);
    const moduleSummary = group
      ? `Module "${group.name}" contains ${group.entries.length} entries: ${group.classes.length} classes, ${group.functions.length} functions, ${group.enums.length} enums`
      : '';

    // Sibling names (entries in same file/parent)
    const siblings = allEntries.filter(e =>
      e !== entry && (
        e.location.file === entry.location.file ||
        e.parentName === entry.parentName
      ),
    );
    const siblingNames = siblings.map(s => s.name).slice(0, 20);

    return {
      entry,
      relatedSignatures,
      moduleSummary,
      siblingNames,
    };
  }
}
