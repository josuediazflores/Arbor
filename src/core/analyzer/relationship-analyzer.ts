import type { DocEntry } from '../../shared/types.js';

export interface Relationship {
  from: string;
  to: string;
  kind: 'calls' | 'extends' | 'implements' | 'uses-type' | 'member-of' | 'returns';
}

export interface RelationshipMap {
  relationships: Relationship[];
  typeIndex: Map<string, DocEntry[]>;
  memberIndex: Map<string, DocEntry[]>;
}

export class RelationshipAnalyzer {
  analyze(entries: DocEntry[]): RelationshipMap {
    const relationships: Relationship[] = [];
    const typeIndex = new Map<string, DocEntry[]>();
    const memberIndex = new Map<string, DocEntry[]>();

    // Build indexes
    for (const entry of entries) {
      // Type index: group by name for cross-referencing
      const existing = typeIndex.get(entry.name) || [];
      existing.push(entry);
      typeIndex.set(entry.name, existing);

      // Member index: group by parent
      if (entry.parentName) {
        const members = memberIndex.get(entry.parentName) || [];
        members.push(entry);
        memberIndex.set(entry.parentName, members);
      }
    }

    // Build relationships
    for (const entry of entries) {
      // Member-of relationships
      if (entry.parentName) {
        relationships.push({
          from: entry.name,
          to: entry.parentName,
          kind: 'member-of',
        });
      }

      // Uses-type relationships (from parameter types and return types)
      const referencedTypes = new Set<string>();
      for (const param of entry.params) {
        this.extractTypeNames(param.type).forEach(t => referencedTypes.add(t));
      }
      if (entry.returnType) {
        this.extractTypeNames(entry.returnType.type).forEach(t => referencedTypes.add(t));
      }

      for (const typeName of referencedTypes) {
        if (typeIndex.has(typeName) && typeName !== entry.name) {
          relationships.push({
            from: entry.name,
            to: typeName,
            kind: 'uses-type',
          });
        }
      }
    }

    return { relationships, typeIndex, memberIndex };
  }

  private extractTypeNames(typeStr: string): string[] {
    // Extract identifiers from type strings, ignoring primitives
    const primitives = new Set([
      'void', 'int', 'char', 'float', 'double', 'bool', 'string',
      'String', 'Int', 'Float', 'Double', 'Bool', 'Unit', 'Any',
      'long', 'short', 'unsigned', 'signed', 'size_t', 'auto',
    ]);

    const identifiers = typeStr.match(/[A-Z]\w*/g) || [];
    return identifiers.filter(id => !primitives.has(id));
  }

  getRelatedEntries(entry: DocEntry, map: RelationshipMap): string[] {
    const related = new Set<string>();

    for (const rel of map.relationships) {
      if (rel.from === entry.name) {
        related.add(rel.to);
      }
      if (rel.to === entry.name) {
        related.add(rel.from);
      }
    }

    related.delete(entry.name);
    return Array.from(related);
  }
}
