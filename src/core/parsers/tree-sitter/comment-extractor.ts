import type Parser from 'tree-sitter';
import { getNodeText } from './ast-utils.js';

export interface RawComment {
  text: string;
  style: 'line' | 'block' | 'doc-line' | 'doc-block';
  startLine: number;
  endLine: number;
}

export function extractRawComments(root: Parser.SyntaxNode, source: string): RawComment[] {
  const comments: RawComment[] = [];
  collectComments(root, source, comments);
  return comments;
}

function collectComments(node: Parser.SyntaxNode, source: string, comments: RawComment[]): void {
  if (node.type === 'comment' || node.type === 'multiline_comment' || node.type === 'line_comment') {
    const text = getNodeText(node, source);
    comments.push({
      text,
      style: classifyComment(text),
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
    });
  }
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) collectComments(child, source, comments);
  }
}

function classifyComment(text: string): RawComment['style'] {
  if (text.startsWith('/**')) return 'doc-block';
  if (text.startsWith('///')) return 'doc-line';
  if (text.startsWith('/*')) return 'block';
  return 'line';
}

export function findCommentForNode(
  node: Parser.SyntaxNode,
  comments: RawComment[],
): RawComment | undefined {
  const nodeLine = node.startPosition.row;

  // Find the closest comment that ends on the line immediately before the node
  // or on the same line (for inline comments)
  let best: RawComment | undefined;
  for (const comment of comments) {
    if (comment.endLine === nodeLine - 1 || comment.endLine === nodeLine) {
      if (!best || comment.endLine > best.endLine) {
        best = comment;
      }
    }
  }
  return best;
}

export function stripCommentDelimiters(text: string): string {
  // Handle doc block comments: /** ... */
  if (text.startsWith('/**') && text.endsWith('*/')) {
    return text
      .slice(3, -2)
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim();
  }

  // Handle block comments: /* ... */
  if (text.startsWith('/*') && text.endsWith('*/')) {
    return text
      .slice(2, -2)
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim();
  }

  // Handle line comments: // or ///
  if (text.startsWith('///')) {
    return text
      .split('\n')
      .map(line => line.replace(/^\s*\/\/\/\s?/, ''))
      .join('\n')
      .trim();
  }

  if (text.startsWith('//')) {
    return text
      .split('\n')
      .map(line => line.replace(/^\s*\/\/\s?/, ''))
      .join('\n')
      .trim();
  }

  return text.trim();
}
