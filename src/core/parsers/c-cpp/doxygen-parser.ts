import type { ParamEntry, ReturnEntry, ThrowsEntry } from '../../../shared/types.js';
import { stripCommentDelimiters } from '../tree-sitter/comment-extractor.js';

export interface DoxygenDoc {
  brief?: string;
  description?: string;
  params: ParamEntry[];
  returns?: ReturnEntry;
  throws: ThrowsEntry[];
  tags: string[];
}

export function parseDoxygenComment(rawComment: string): DoxygenDoc {
  const text = stripCommentDelimiters(rawComment);
  const lines = text.split('\n');

  const doc: DoxygenDoc = { params: [], throws: [], tags: [] };
  let currentSection: 'brief' | 'description' | 'param' | 'return' | 'throws' | null = null;
  let currentParam: ParamEntry | null = null;
  let descriptionLines: string[] = [];
  let briefLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // @brief or \brief
    const briefMatch = line.match(/^[@\\]brief\s+(.*)/);
    if (briefMatch) {
      briefLines.push(briefMatch[1]);
      currentSection = 'brief';
      continue;
    }

    // @param or \param
    const paramMatch = line.match(/^[@\\]param(?:\[(?:in|out|in,out)\])?\s+(\w+)\s+(.*)/);
    if (paramMatch) {
      if (currentParam) doc.params.push(currentParam);
      currentParam = { name: paramMatch[1], type: '', description: paramMatch[2] };
      currentSection = 'param';
      continue;
    }

    // @return/@returns or \return/\returns
    const returnMatch = line.match(/^[@\\]returns?\s+(.*)/);
    if (returnMatch) {
      if (currentParam) { doc.params.push(currentParam); currentParam = null; }
      doc.returns = { type: '', description: returnMatch[1] };
      currentSection = 'return';
      continue;
    }

    // @throws/@throw or \throws/\throw
    const throwsMatch = line.match(/^[@\\]throws?\s+(\w+)?\s*(.*)/);
    if (throwsMatch) {
      if (currentParam) { doc.params.push(currentParam); currentParam = null; }
      doc.throws.push({ type: throwsMatch[1], description: throwsMatch[2] || undefined });
      currentSection = 'throws';
      continue;
    }

    // Other @ tags
    const tagMatch = line.match(/^[@\\](\w+)\s*(.*)/);
    if (tagMatch) {
      if (currentParam) { doc.params.push(currentParam); currentParam = null; }
      doc.tags.push(`@${tagMatch[1]} ${tagMatch[2]}`.trim());
      currentSection = null;
      continue;
    }

    // Continuation line
    if (line === '') {
      if (currentSection === 'brief') {
        currentSection = 'description';
      }
      continue;
    }

    switch (currentSection) {
      case 'brief':
        briefLines.push(line);
        break;
      case 'param':
        if (currentParam) {
          currentParam.description = (currentParam.description || '') + ' ' + line;
        }
        break;
      case 'return':
        if (doc.returns) {
          doc.returns.description = (doc.returns.description || '') + ' ' + line;
        }
        break;
      case 'description':
        descriptionLines.push(line);
        break;
      default:
        // First lines before any tag are treated as brief
        if (!doc.brief) {
          briefLines.push(line);
          currentSection = 'brief';
        } else {
          descriptionLines.push(line);
        }
    }
  }

  if (currentParam) doc.params.push(currentParam);

  if (briefLines.length > 0) {
    doc.brief = briefLines.join(' ').trim();
  }
  if (descriptionLines.length > 0) {
    doc.description = descriptionLines.join('\n').trim();
  }

  return doc;
}
