import type { ParamEntry, ReturnEntry, ThrowsEntry } from '../../../shared/types.js';
import { stripCommentDelimiters } from '../tree-sitter/comment-extractor.js';

export interface KDoc {
  description?: string;
  params: ParamEntry[];
  returns?: ReturnEntry;
  throws: ThrowsEntry[];
  properties: Array<{ name: string; description: string }>;
  tags: string[];
}

export function parseKDoc(rawComment: string): KDoc {
  const text = stripCommentDelimiters(rawComment);
  const lines = text.split('\n');

  const doc: KDoc = { params: [], throws: [], properties: [], tags: [] };
  let descriptionLines: string[] = [];
  let currentSection: 'description' | 'param' | 'return' | 'throws' | 'property' | null = 'description';
  let currentParam: ParamEntry | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // @param
    const paramMatch = line.match(/^@param\s+(\w+)\s+(.*)/);
    if (paramMatch) {
      if (currentParam) doc.params.push(currentParam);
      currentParam = { name: paramMatch[1], type: '', description: paramMatch[2] };
      currentSection = 'param';
      continue;
    }

    // @return
    const returnMatch = line.match(/^@return\s+(.*)/);
    if (returnMatch) {
      if (currentParam) { doc.params.push(currentParam); currentParam = null; }
      doc.returns = { type: '', description: returnMatch[1] };
      currentSection = 'return';
      continue;
    }

    // @throws / @exception
    const throwsMatch = line.match(/^@(?:throws|exception)\s+(\w+)\s*(.*)/);
    if (throwsMatch) {
      if (currentParam) { doc.params.push(currentParam); currentParam = null; }
      doc.throws.push({ type: throwsMatch[1], description: throwsMatch[2] || undefined });
      currentSection = 'throws';
      continue;
    }

    // @property
    const propMatch = line.match(/^@property\s+(\w+)\s+(.*)/);
    if (propMatch) {
      if (currentParam) { doc.params.push(currentParam); currentParam = null; }
      doc.properties.push({ name: propMatch[1], description: propMatch[2] });
      currentSection = 'property';
      continue;
    }

    // Other @ tags
    const tagMatch = line.match(/^@(\w+)\s*(.*)/);
    if (tagMatch) {
      if (currentParam) { doc.params.push(currentParam); currentParam = null; }
      doc.tags.push(`@${tagMatch[1]} ${tagMatch[2]}`.trim());
      currentSection = null;
      continue;
    }

    // Continuation
    if (line === '' && currentSection === 'description') {
      if (descriptionLines.length > 0) descriptionLines.push('');
      continue;
    }

    switch (currentSection) {
      case 'description':
        descriptionLines.push(line);
        break;
      case 'param':
        if (currentParam && line) {
          currentParam.description = (currentParam.description || '') + ' ' + line;
        }
        break;
      case 'return':
        if (doc.returns && line) {
          doc.returns.description = (doc.returns.description || '') + ' ' + line;
        }
        break;
    }
  }

  if (currentParam) doc.params.push(currentParam);

  if (descriptionLines.length > 0) {
    doc.description = descriptionLines.join('\n').trim();
  }

  return doc;
}
