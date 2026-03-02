import type Parser from 'tree-sitter';

export function findNodesOfType(root: Parser.SyntaxNode, types: string[]): Parser.SyntaxNode[] {
  const results: Parser.SyntaxNode[] = [];
  walkTree(root, (node) => {
    if (types.includes(node.type)) {
      results.push(node);
    }
  });
  return results;
}

export function walkTree(node: Parser.SyntaxNode, callback: (node: Parser.SyntaxNode) => void | boolean): void {
  const result = callback(node);
  if (result === false) return; // returning false stops traversal into children
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkTree(child, callback);
  }
}

export function getNodeText(node: Parser.SyntaxNode, source: string): string {
  return source.substring(node.startIndex, node.endIndex);
}

export function getPrecedingComments(node: Parser.SyntaxNode, source: string): string | undefined {
  const comments: string[] = [];
  let sibling = node.previousNamedSibling;

  // Also check unnamed siblings (comments are sometimes unnamed)
  let current: Parser.SyntaxNode | null = node;
  // Walk backwards through siblings to find comment nodes
  const parent = node.parent;
  if (!parent) return undefined;

  const nodeIndex = getChildIndex(parent, node);
  for (let i = nodeIndex - 1; i >= 0; i--) {
    const child = parent.child(i);
    if (!child) continue;

    if (child.type === 'comment' || child.type === 'multiline_comment' || child.type === 'line_comment') {
      comments.unshift(getNodeText(child, source));
    } else if (child.type !== '\n' && child.type.trim() !== '') {
      // Stop at first non-comment, non-whitespace node
      break;
    }
  }

  return comments.length > 0 ? comments.join('\n') : undefined;
}

function getChildIndex(parent: Parser.SyntaxNode, child: Parser.SyntaxNode): number {
  for (let i = 0; i < parent.childCount; i++) {
    if (parent.child(i)?.id === child.id) return i;
  }
  return -1;
}

export function extractSignature(node: Parser.SyntaxNode, source: string): string {
  // Get the text up to the body (first { or = for expression bodies)
  const text = getNodeText(node, source);
  const bodyStart = findBodyStart(node);
  if (bodyStart !== null) {
    const offset = bodyStart - node.startIndex;
    return text.substring(0, offset).trim();
  }
  // No body (forward declaration), return full text
  return text.replace(/;$/, '').trim();
}

function findBodyStart(node: Parser.SyntaxNode): number | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child) continue;
    if (
      child.type === 'compound_statement' ||
      child.type === 'function_body' ||
      child.type === 'class_body' ||
      child.type === 'statements' ||
      child.type === 'field_declaration_list' ||
      child.type === 'enumerator_list'
    ) {
      return child.startIndex;
    }
  }
  return null;
}

export function findChildOfType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child?.type === type) return child;
  }
  return null;
}

export function findChildrenOfType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
  const results: Parser.SyntaxNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child?.type === type) results.push(child);
  }
  return results;
}

export function getNamedFieldText(node: Parser.SyntaxNode, fieldName: string, source: string): string | undefined {
  const child = node.childForFieldName(fieldName);
  return child ? getNodeText(child, source) : undefined;
}
