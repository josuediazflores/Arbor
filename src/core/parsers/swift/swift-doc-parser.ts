import type { ParamEntry, ReturnEntry, ThrowsEntry } from '../../../shared/types.js';
import { stripCommentDelimiters } from '../tree-sitter/comment-extractor.js';

export interface SwiftDoc {
  description?: string;
  params: ParamEntry[];
  returns?: ReturnEntry;
  throws: ThrowsEntry[];
  tags: string[];
}

export function parseSwiftDocComment(rawComment: string): SwiftDoc {
  const text = stripCommentDelimiters(rawComment);
  const lines = text.split('\n');

  const doc: SwiftDoc = { params: [], throws: [], tags: [] };
  let descriptionLines: string[] = [];
  let currentSection: string | null = 'description';

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // - Parameter name: description
    const paramMatch = line.match(/^-\s+[Pp]arameter\s+(\w+)\s*:\s*(.*)/);
    if (paramMatch) {
      doc.params.push({ name: paramMatch[1], type: '', description: paramMatch[2] });
      currentSection = 'param';
      continue;
    }

    // - Parameters: (block style)
    if (/^-\s+[Pp]arameters\s*:/.test(line)) {
      currentSection = 'params-block';
      continue;
    }

    // Indented parameter in block: - name: description
    if (currentSection === 'params-block') {
      const blockParam = line.match(/^-\s+(\w+)\s*:\s*(.*)/);
      if (blockParam) {
        doc.params.push({ name: blockParam[1], type: '', description: blockParam[2] });
        continue;
      }
      if (!line.startsWith('-') && line !== '') {
        // Continuation of previous param
        const lastParam = doc.params[doc.params.length - 1];
        if (lastParam) {
          lastParam.description = (lastParam.description || '') + ' ' + line;
        }
        continue;
      }
      currentSection = null;
    }

    // - Returns: description
    const returnsMatch = line.match(/^-\s+[Rr]eturns?\s*:\s*(.*)/);
    if (returnsMatch) {
      doc.returns = { type: '', description: returnsMatch[1] };
      currentSection = 'return';
      continue;
    }

    // - Throws: description
    const throwsMatch = line.match(/^-\s+[Tt]hrows?\s*:\s*(.*)/);
    if (throwsMatch) {
      doc.throws.push({ description: throwsMatch[1] });
      currentSection = 'throws';
      continue;
    }

    // Other - Tag: value
    const tagMatch = line.match(/^-\s+(\w+)\s*:\s*(.*)/);
    if (tagMatch && currentSection !== 'params-block') {
      doc.tags.push(`${tagMatch[1]}: ${tagMatch[2]}`);
      currentSection = null;
      continue;
    }

    // Continuation
    if (line === '') {
      if (currentSection === 'description' && descriptionLines.length > 0) {
        descriptionLines.push('');
      }
      continue;
    }

    switch (currentSection) {
      case 'description':
        descriptionLines.push(line);
        break;
      case 'return':
        if (doc.returns) {
          doc.returns.description = (doc.returns.description || '') + ' ' + line;
        }
        break;
      case 'throws':
        if (doc.throws.length > 0) {
          const last = doc.throws[doc.throws.length - 1];
          last.description = (last.description || '') + ' ' + line;
        }
        break;
    }
  }

  if (descriptionLines.length > 0) {
    doc.description = descriptionLines.join('\n').trim();
  }

  return doc;
}
