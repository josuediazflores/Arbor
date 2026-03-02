import type Parser from 'tree-sitter';
import type { DocEntry, ParamEntry, Visibility, SourceLocation } from '../../../shared/types.js';
import type { ExtractionContext, ExtractionResult, LanguageExtractor } from '../extractor-interface.js';
import { ParserManager } from '../tree-sitter/parser-manager.js';
import {
  findNodesOfType, getNodeText, extractSignature,
  findChildOfType, findChildrenOfType, walkTree,
} from '../tree-sitter/ast-utils.js';
import { extractRawComments, findCommentForNode } from '../tree-sitter/comment-extractor.js';
import { parseKDoc } from './kdoc-parser.js';

export class KotlinExtractor implements LanguageExtractor {
  readonly language = 'kotlin' as const;
  readonly supportedExtensions = ['.kt', '.kts'];
  private parserManager: ParserManager;

  constructor(parserManager: ParserManager) {
    this.parserManager = parserManager;
  }

  async extract(context: ExtractionContext): Promise<ExtractionResult> {
    const entries: DocEntry[] = [];
    const errors: Array<{ message: string; line?: number }> = [];

    const parser = await this.parserManager.getParser('kotlin');
    const tree = this.parserManager.parse(context.source, parser);
    const comments = extractRawComments(tree.rootNode, context.source);

    walkTree(tree.rootNode, (node) => {
      try {
        let entry: DocEntry | null = null;

        switch (node.type) {
          case 'function_declaration':
            entry = this.extractFunction(node, context, comments);
            break;
          case 'class_declaration':
            entry = this.extractClass(node, context, comments);
            if (entry) {
              entries.push(entry);
              entries.push(...this.extractClassMembers(node, context, comments, entry.name));
              return false;
            }
            break;
          case 'object_declaration':
            entry = this.extractObject(node, context, comments);
            if (entry) {
              entries.push(entry);
              entries.push(...this.extractClassMembers(node, context, comments, entry.name));
              return false;
            }
            break;
          case 'property_declaration':
            if (!node.parent || node.parent.type === 'source_file') {
              entry = this.extractProperty(node, context, comments);
            }
            break;
        }

        if (entry) entries.push(entry);
      } catch (e) {
        errors.push({ message: (e as Error).message, line: node.startPosition.row + 1 });
      }
    });

    return { entries, errors };
  }

  private extractFunction(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
    parentName?: string,
  ): DocEntry | null {
    const nameNode = findChildOfType(node, 'simple_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const params = this.extractParams(node, context.source);
    const returnType = this.extractReturnType(node, context.source);

    const comment = findCommentForNode(node, comments);
    const kdoc = comment ? parseKDoc(comment.text) : undefined;

    if (kdoc) {
      for (const p of params) {
        const kp = kdoc.params.find(k => k.name === p.name);
        if (kp?.description) p.description = kp.description;
      }
    }

    const modifiers = this.extractModifiers(node, context.source);

    return {
      name,
      kind: parentName ? 'method' : 'function',
      language: 'kotlin',
      signature: extractSignature(node, context.source),
      description: kdoc?.description,
      params,
      returnType: kdoc?.returns ?? (returnType ? { type: returnType } : undefined),
      throws: kdoc?.throws ?? [],
      examples: [],
      tags: kdoc?.tags,
      visibility: this.getVisibility(modifiers),
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
      parentName,
      isStatic: modifiers.includes('companion'),
      genericParams: this.extractGenericParams(node, context.source),
      modifiers,
    };
  }

  private extractClass(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = findChildOfType(node, 'type_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node, comments);
    const kdoc = comment ? parseKDoc(comment.text) : undefined;
    const modifiers = this.extractModifiers(node, context.source);

    // Determine kind: data class, sealed class, etc.
    const fullText = getNodeText(node, context.source);
    let kind: DocEntry['kind'] = 'class';

    return {
      name,
      kind,
      language: 'kotlin',
      signature: extractSignature(node, context.source),
      description: kdoc?.description,
      params: [],
      throws: [],
      examples: [],
      tags: kdoc?.tags,
      visibility: this.getVisibility(modifiers),
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
      genericParams: this.extractGenericParams(node, context.source),
      modifiers,
    };
  }

  private extractObject(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = findChildOfType(node, 'type_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node, comments);
    const kdoc = comment ? parseKDoc(comment.text) : undefined;

    return {
      name,
      kind: 'object',
      language: 'kotlin',
      signature: extractSignature(node, context.source),
      description: kdoc?.description,
      params: [],
      throws: [],
      examples: [],
      tags: kdoc?.tags,
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
      modifiers: this.extractModifiers(node, context.source),
    };
  }

  private extractProperty(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
    parentName?: string,
  ): DocEntry | null {
    // Find the variable declaration within the property
    const varDecl = findChildOfType(node, 'variable_declaration');
    const nameNode = varDecl
      ? findChildOfType(varDecl, 'simple_identifier')
      : findChildOfType(node, 'simple_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node, comments);
    const kdoc = comment ? parseKDoc(comment.text) : undefined;

    return {
      name,
      kind: 'property',
      language: 'kotlin',
      signature: extractSignature(node, context.source),
      description: kdoc?.description,
      params: [],
      throws: [],
      examples: [],
      tags: kdoc?.tags,
      visibility: this.getVisibility(this.extractModifiers(node, context.source)),
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
      parentName,
    };
  }

  private extractClassMembers(
    classNode: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
    className: string,
  ): DocEntry[] {
    const entries: DocEntry[] = [];
    const body = findChildOfType(classNode, 'class_body');
    if (!body) return entries;

    walkTree(body, (node) => {
      if (node === body) return; // skip the body node itself

      if (node.type === 'function_declaration') {
        const entry = this.extractFunction(node, context, comments, className);
        if (entry) entries.push(entry);
        return false;
      }

      if (node.type === 'property_declaration') {
        const entry = this.extractProperty(node, context, comments, className);
        if (entry) entries.push(entry);
        return false;
      }

      if (node.type === 'companion_object') {
        // Extract companion object members
        const companionBody = findChildOfType(node, 'class_body');
        if (companionBody) {
          walkTree(companionBody, (cNode) => {
            if (cNode === companionBody) return;
            if (cNode.type === 'function_declaration') {
              const entry = this.extractFunction(cNode, context, comments, className);
              if (entry) {
                entry.isStatic = true;
                entries.push(entry);
              }
              return false;
            }
          });
        }
        return false;
      }

      // Don't recurse into nested classes
      if (node.type === 'class_declaration' || node.type === 'object_declaration') {
        return false;
      }
    });

    return entries;
  }

  private extractParams(node: Parser.SyntaxNode, source: string): ParamEntry[] {
    const paramList = findChildOfType(node, 'function_value_parameters');
    if (!paramList) return [];

    const params: ParamEntry[] = [];
    const paramNodes = findChildrenOfType(paramList, 'parameter');

    for (const paramNode of paramNodes) {
      const nameNode = findChildOfType(paramNode, 'simple_identifier');
      const typeNode = paramNode.childForFieldName('type')
        ?? findChildOfType(paramNode, 'user_type')
        ?? findChildOfType(paramNode, 'nullable_type');

      const name = nameNode ? getNodeText(nameNode, source) : `arg${params.length}`;
      const type = typeNode ? getNodeText(typeNode, source) : '';

      // Check for default value
      let defaultValue: string | undefined;
      for (let i = 0; i < paramNode.childCount; i++) {
        const child = paramNode.child(i);
        if (child?.type === '=') {
          const nextChild = paramNode.child(i + 1);
          if (nextChild) defaultValue = getNodeText(nextChild, source);
        }
      }

      params.push({ name, type, defaultValue, isOptional: !!defaultValue });
    }

    return params;
  }

  private extractReturnType(node: Parser.SyntaxNode, source: string): string | undefined {
    // Look for return type after ':'
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child?.type === ':') {
        const next = node.child(i + 1);
        if (next && next.type !== 'function_body') {
          return getNodeText(next, source);
        }
      }
    }
    return undefined;
  }

  private extractModifiers(node: Parser.SyntaxNode, source: string): string[] {
    const modifiers: string[] = [];
    const modList = findChildOfType(node, 'modifiers');
    if (modList) {
      walkTree(modList, (n) => {
        if (n.type === 'visibility_modifier' || n.type === 'inheritance_modifier' ||
            n.type === 'class_modifier' || n.type === 'member_modifier' ||
            n.type === 'function_modifier') {
          modifiers.push(getNodeText(n, source));
        }
      });
    }
    return modifiers;
  }

  private extractGenericParams(node: Parser.SyntaxNode, source: string): string[] | undefined {
    const typeParams = findChildOfType(node, 'type_parameters');
    if (!typeParams) return undefined;

    const params: string[] = [];
    walkTree(typeParams, (n) => {
      if (n.type === 'type_parameter') {
        params.push(getNodeText(n, source));
      }
    });
    return params.length > 0 ? params : undefined;
  }

  private getVisibility(modifiers: string[]): Visibility | undefined {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    if (modifiers.includes('internal')) return 'internal';
    return 'public'; // Kotlin default
  }

  private makeLocation(node: Parser.SyntaxNode, file: string): SourceLocation {
    return {
      file,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    };
  }
}
