import type { DocEntry, ParamEntry, Visibility, SourceLocation } from '../../../shared/types.js';
import type { ExtractionContext, ExtractionResult, LanguageExtractor } from '../extractor-interface.js';
import { ParserManager } from '../tree-sitter/parser-manager.js';
import { parseSwiftDocComment } from './swift-doc-parser.js';

/**
 * Swift extractor using regex-based parsing.
 * Falls back to this when tree-sitter-swift native module is unavailable.
 */
export class SwiftExtractor implements LanguageExtractor {
  readonly language = 'swift' as const;
  readonly supportedExtensions = ['.swift'];
  private parserManager: ParserManager;
  private useTreeSitter = false;

  constructor(parserManager: ParserManager) {
    this.parserManager = parserManager;
    this.useTreeSitter = parserManager.isLanguageAvailable('swift');
  }

  async extract(context: ExtractionContext): Promise<ExtractionResult> {
    // Use regex-based extraction (tree-sitter-swift often fails to compile)
    return this.extractWithRegex(context);
  }

  private extractWithRegex(context: ExtractionContext): ExtractionResult {
    const entries: DocEntry[] = [];
    const errors: Array<{ message: string; line?: number }> = [];
    const lines = context.source.split('\n');

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();

      // Collect doc comments
      let docComment: string | undefined;
      if (line.startsWith('///') || line.startsWith('/**')) {
        const commentLines: string[] = [];
        if (line.startsWith('/**')) {
          // Block comment
          let block = lines[i];
          while (i < lines.length && !block.includes('*/')) {
            commentLines.push(lines[i]);
            i++;
            if (i < lines.length) block = lines[i];
          }
          if (i < lines.length) commentLines.push(lines[i]);
          i++;
          docComment = commentLines.join('\n');
        } else {
          // Line comments
          while (i < lines.length && lines[i].trim().startsWith('///')) {
            commentLines.push(lines[i]);
            i++;
          }
          docComment = commentLines.join('\n');
        }
      }

      if (i >= lines.length) break;
      const declarationLine = lines[i].trim();

      try {
        // Function/method declaration
        const funcMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate|open|static|class|override|mutating|@\w+)\s+)*)func\s+(\w+)/
        );
        if (funcMatch) {
          const fullSig = this.extractFullSignature(lines, i);
          const entry = this.parseFunctionDeclaration(fullSig, funcMatch[2], docComment, context, i);
          if (entry) {
            entry.modifiers = funcMatch[1].trim().split(/\s+/).filter(Boolean);
            entry.visibility = this.parseVisibility(entry.modifiers);
            entry.isStatic = entry.modifiers.includes('static') || entry.modifiers.includes('class');
            entries.push(entry);
          }
          i++;
          continue;
        }

        // Class declaration
        const classMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate|open|final)\s+)*)class\s+(\w+)/
        );
        if (classMatch) {
          const entry = this.makeEntry(classMatch[2], 'class', declarationLine, docComment, context, i);
          entries.push(entry);
          i++;
          continue;
        }

        // Struct declaration
        const structMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate)\s+)*)struct\s+(\w+)/
        );
        if (structMatch) {
          const entry = this.makeEntry(structMatch[2], 'struct', declarationLine, docComment, context, i);
          entries.push(entry);
          i++;
          continue;
        }

        // Enum declaration
        const enumMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate|indirect)\s+)*)enum\s+(\w+)/
        );
        if (enumMatch) {
          const entry = this.makeEntry(enumMatch[2], 'enum', declarationLine, docComment, context, i);
          entries.push(entry);
          i++;
          continue;
        }

        // Protocol declaration
        const protocolMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate)\s+)*)protocol\s+(\w+)/
        );
        if (protocolMatch) {
          const entry = this.makeEntry(protocolMatch[2], 'protocol', declarationLine, docComment, context, i);
          entries.push(entry);
          i++;
          continue;
        }

        // Extension declaration
        const extMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate)\s+)*)extension\s+(\w+)/
        );
        if (extMatch) {
          const entry = this.makeEntry(extMatch[2], 'extension', declarationLine, docComment, context, i);
          entries.push(entry);
          i++;
          continue;
        }

        // Init declaration
        const initMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate|open|required|convenience)\s+)*)init[?(]/
        );
        if (initMatch) {
          const fullSig = this.extractFullSignature(lines, i);
          const entry = this.parseFunctionDeclaration(fullSig, 'init', docComment, context, i);
          if (entry) {
            entry.kind = 'constructor';
            entries.push(entry);
          }
          i++;
          continue;
        }

        // Property declaration
        const propMatch = declarationLine.match(
          /^((?:(?:public|private|internal|fileprivate|open|static|class|lazy|weak)\s+)*)(?:var|let)\s+(\w+)/
        );
        if (propMatch) {
          const entry = this.makeEntry(propMatch[2], 'property', declarationLine, docComment, context, i);
          entries.push(entry);
          i++;
          continue;
        }
      } catch (e) {
        errors.push({ message: (e as Error).message, line: i + 1 });
      }

      i++;
    }

    return { entries, errors };
  }

  private extractFullSignature(lines: string[], startLine: number): string {
    let sig = lines[startLine];
    let braceCount = 0;
    let parenCount = 0;

    for (const ch of sig) {
      if (ch === '(') parenCount++;
      if (ch === ')') parenCount--;
      if (ch === '{') braceCount++;
    }

    // Continue to next lines if parentheses aren't balanced
    let lineIdx = startLine + 1;
    while (parenCount > 0 && lineIdx < lines.length) {
      sig += '\n' + lines[lineIdx];
      for (const ch of lines[lineIdx]) {
        if (ch === '(') parenCount++;
        if (ch === ')') parenCount--;
      }
      lineIdx++;
    }

    // Trim at opening brace
    const braceIdx = sig.indexOf('{');
    if (braceIdx !== -1) {
      sig = sig.substring(0, braceIdx).trim();
    }

    return sig;
  }

  private parseFunctionDeclaration(
    signature: string,
    name: string,
    rawComment: string | undefined,
    context: ExtractionContext,
    line: number,
  ): DocEntry | null {
    const doc = rawComment ? parseSwiftDocComment(rawComment) : undefined;
    const params = this.parseSwiftParams(signature);

    if (doc) {
      for (const p of params) {
        const dp = doc.params.find(d => d.name === p.name);
        if (dp?.description) p.description = dp.description;
      }
    }

    // Extract return type
    const returnMatch = signature.match(/->\s*(.+?)(?:\s*\{|$)/);
    const returnType = returnMatch ? returnMatch[1].trim() : undefined;
    const isAsync = signature.includes(' async ') || signature.includes(' async\n');
    const throwsMatch = signature.includes(' throws ') || signature.includes(' throws\n');

    return {
      name,
      kind: 'function',
      language: 'swift',
      signature: signature.replace(/\n\s*/g, ' ').trim(),
      description: doc?.description,
      params,
      returnType: doc?.returns ?? (returnType ? { type: returnType } : undefined),
      throws: doc?.throws ?? (throwsMatch ? [{ description: 'This function can throw.' }] : []),
      examples: [],
      tags: doc?.tags,
      location: this.makeLocation(line, context.file),
      rawComment,
      isAsync,
    };
  }

  private parseSwiftParams(signature: string): ParamEntry[] {
    const params: ParamEntry[] = [];
    // Match content between first ( and matching )
    const parenStart = signature.indexOf('(');
    if (parenStart === -1) return params;

    let depth = 0;
    let parenEnd = -1;
    for (let i = parenStart; i < signature.length; i++) {
      if (signature[i] === '(') depth++;
      if (signature[i] === ')') { depth--; if (depth === 0) { parenEnd = i; break; } }
    }
    if (parenEnd === -1) return params;

    const paramStr = signature.substring(parenStart + 1, parenEnd);
    if (!paramStr.trim()) return params;

    // Split by commas not inside angle brackets or parens
    const paramParts = this.splitParams(paramStr);

    for (const part of paramParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Swift params: externalName internalName: Type = default
      // or just: name: Type
      // or: _ name: Type
      const paramMatch = trimmed.match(/^(\w+)?\s*(\w+)\s*:\s*(.+?)(?:\s*=\s*(.+))?$/);
      if (paramMatch) {
        const type = paramMatch[3].trim();
        params.push({
          name: paramMatch[2],
          type,
          defaultValue: paramMatch[4]?.trim(),
          isOptional: !!paramMatch[4] || type.endsWith('?'),
          isVariadic: type.endsWith('...'),
        });
      }
    }

    return params;
  }

  private splitParams(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (const ch of str) {
      if (ch === '<' || ch === '(' || ch === '[') depth++;
      if (ch === '>' || ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current);
    return parts;
  }

  private makeEntry(
    name: string,
    kind: DocEntry['kind'],
    signature: string,
    rawComment: string | undefined,
    context: ExtractionContext,
    line: number,
  ): DocEntry {
    const doc = rawComment ? parseSwiftDocComment(rawComment) : undefined;

    return {
      name,
      kind,
      language: 'swift',
      signature: signature.replace(/{.*$/, '').trim(),
      description: doc?.description,
      params: [],
      throws: doc?.throws ?? [],
      examples: [],
      tags: doc?.tags,
      location: this.makeLocation(line, context.file),
      rawComment,
    };
  }

  private parseVisibility(modifiers: string[]): Visibility | undefined {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('internal')) return 'internal';
    if (modifiers.includes('fileprivate')) return 'fileprivate';
    if (modifiers.includes('open')) return 'open';
    return 'internal'; // Swift default
  }

  private makeLocation(line: number, file: string): SourceLocation {
    return {
      file,
      line: line + 1,
      column: 1,
    };
  }
}
