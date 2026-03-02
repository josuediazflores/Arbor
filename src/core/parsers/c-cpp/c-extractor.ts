import type Parser from 'tree-sitter';
import type { DocEntry, ParamEntry, SourceLocation, SupportedLanguage } from '../../../shared/types.js';
import type { ExtractionContext, ExtractionResult, LanguageExtractor } from '../extractor-interface.js';
import { ParserManager } from '../tree-sitter/parser-manager.js';
import {
  findNodesOfType, getNodeText, extractSignature,
  findChildOfType, findChildrenOfType, getNamedFieldText,
} from '../tree-sitter/ast-utils.js';
import { extractRawComments, findCommentForNode } from '../tree-sitter/comment-extractor.js';
import { parseDoxygenComment } from './doxygen-parser.js';

export class CExtractor implements LanguageExtractor {
  readonly language: SupportedLanguage = 'c';
  readonly supportedExtensions = ['.c', '.h'];
  private parserManager: ParserManager;

  constructor(parserManager: ParserManager) {
    this.parserManager = parserManager;
  }

  async extract(context: ExtractionContext): Promise<ExtractionResult> {
    const entries: DocEntry[] = [];
    const errors: Array<{ message: string; line?: number }> = [];

    const parser = await this.parserManager.getParser('c');
    const tree = this.parserManager.parse(context.source, parser);
    const comments = extractRawComments(tree.rootNode, context.source);

    // Extract functions
    const funcNodes = findNodesOfType(tree.rootNode, ['function_definition', 'declaration']);
    for (const node of funcNodes) {
      try {
        const entry = this.extractFunction(node, context, comments);
        if (entry) entries.push(entry);
      } catch (e) {
        errors.push({ message: (e as Error).message, line: node.startPosition.row + 1 });
      }
    }

    // Extract structs
    const structNodes = findNodesOfType(tree.rootNode, ['struct_specifier']);
    for (const node of structNodes) {
      try {
        const entry = this.extractStruct(node, context, comments);
        if (entry) entries.push(entry);
      } catch (e) {
        errors.push({ message: (e as Error).message, line: node.startPosition.row + 1 });
      }
    }

    // Extract enums
    const enumNodes = findNodesOfType(tree.rootNode, ['enum_specifier']);
    for (const node of enumNodes) {
      try {
        const entry = this.extractEnum(node, context, comments);
        if (entry) entries.push(entry);
      } catch (e) {
        errors.push({ message: (e as Error).message, line: node.startPosition.row + 1 });
      }
    }

    // Extract typedefs
    const typedefNodes = findNodesOfType(tree.rootNode, ['type_definition']);
    for (const node of typedefNodes) {
      try {
        const entry = this.extractTypedef(node, context, comments);
        if (entry) entries.push(entry);
      } catch (e) {
        errors.push({ message: (e as Error).message, line: node.startPosition.row + 1 });
      }
    }

    return { entries, errors };
  }

  private extractFunction(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    // For declarations, only extract if they have function declarators
    if (node.type === 'declaration') {
      const declarator = findChildOfType(node, 'function_declarator')
        ?? this.findNestedFunctionDeclarator(node);
      if (!declarator) return null;
    }

    const declarator = node.type === 'function_definition'
      ? findChildOfType(node, 'function_declarator') ?? this.findNestedFunctionDeclarator(node)
      : findChildOfType(node, 'function_declarator') ?? this.findNestedFunctionDeclarator(node);

    if (!declarator) return null;

    const nameNode = declarator.childForFieldName('declarator')
      ?? findChildOfType(declarator, 'identifier')
      ?? findChildOfType(declarator, 'field_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const signature = extractSignature(node, context.source);
    const params = this.extractParams(declarator, context.source);

    // Extract return type
    const typeNode = node.childForFieldName('type') ?? findChildOfType(node, 'primitive_type')
      ?? findChildOfType(node, 'type_identifier');
    const returnType = typeNode ? { type: getNodeText(typeNode, context.source) } : undefined;

    const comment = findCommentForNode(node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    // Merge parsed doc into params
    if (docComment) {
      for (const p of params) {
        const docParam = docComment.params.find(dp => dp.name === p.name);
        if (docParam?.description) p.description = docParam.description;
      }
    }

    const entry: DocEntry = {
      name,
      kind: 'function',
      language: context.language,
      signature,
      description: docComment?.brief || docComment?.description,
      params,
      returnType: docComment?.returns ?? returnType,
      throws: docComment?.throws ?? [],
      examples: [],
      tags: docComment?.tags,
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
    };

    return entry;
  }

  private findNestedFunctionDeclarator(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
    // Look inside pointer_declarator, etc.
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      if (child.type === 'function_declarator') return child;
      if (child.type === 'pointer_declarator' || child.type === 'init_declarator') {
        const nested = findChildOfType(child, 'function_declarator');
        if (nested) return nested;
      }
    }
    return null;
  }

  protected extractParams(declarator: Parser.SyntaxNode, source: string): ParamEntry[] {
    const paramList = findChildOfType(declarator, 'parameter_list');
    if (!paramList) return [];

    const params: ParamEntry[] = [];
    const paramDecls = findChildrenOfType(paramList, 'parameter_declaration');

    for (const paramDecl of paramDecls) {
      const typeNode = paramDecl.childForFieldName('type');
      const declNode = paramDecl.childForFieldName('declarator')
        ?? findChildOfType(paramDecl, 'identifier');

      const type = typeNode ? getNodeText(typeNode, source) : getNodeText(paramDecl, source);
      const name = declNode ? getNodeText(declNode, source).replace(/^\*+/, '') : '';

      if (type === 'void' && !name) continue; // void parameter list

      params.push({
        name: name || `arg${params.length}`,
        type,
        isVariadic: paramDecl.type === 'variadic_parameter',
      });
    }

    // Check for variadic
    const variadic = findChildOfType(paramList, 'variadic_parameter');
    if (variadic) {
      params.push({ name: '...', type: '...', isVariadic: true });
    }

    return params;
  }

  private extractStruct(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = node.childForFieldName('name')
      ?? findChildOfType(node, 'type_identifier');
    if (!nameNode) return null;

    // Skip if this struct is inside a typedef (handled by extractTypedef)
    if (node.parent?.type === 'type_definition') return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node.parent ?? node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    return {
      name,
      kind: 'struct',
      language: context.language,
      signature: extractSignature(node, context.source),
      description: docComment?.brief || docComment?.description,
      params: [],
      throws: [],
      examples: [],
      tags: docComment?.tags,
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
    };
  }

  private extractEnum(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = node.childForFieldName('name')
      ?? findChildOfType(node, 'type_identifier');
    if (!nameNode) return null;

    if (node.parent?.type === 'type_definition') return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node.parent ?? node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    return {
      name,
      kind: 'enum',
      language: context.language,
      signature: getNodeText(node, context.source),
      description: docComment?.brief || docComment?.description,
      params: [],
      throws: [],
      examples: [],
      tags: docComment?.tags,
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
    };
  }

  private extractTypedef(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const declarator = node.childForFieldName('declarator')
      ?? findChildOfType(node, 'type_identifier');
    if (!declarator) return null;

    const name = getNodeText(declarator, context.source);
    const comment = findCommentForNode(node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    return {
      name,
      kind: 'typedef',
      language: context.language,
      signature: getNodeText(node, context.source).replace(/;$/, '').trim(),
      description: docComment?.brief || docComment?.description,
      params: [],
      throws: [],
      examples: [],
      tags: docComment?.tags,
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
    };
  }

  protected makeLocation(node: Parser.SyntaxNode, file: string): SourceLocation {
    return {
      file,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    };
  }
}
