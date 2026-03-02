import type Parser from 'tree-sitter';
import type { DocEntry, Visibility } from '../../../shared/types.js';
import type { ExtractionContext, ExtractionResult } from '../extractor-interface.js';
import { ParserManager } from '../tree-sitter/parser-manager.js';
import {
  findNodesOfType, getNodeText, extractSignature,
  findChildOfType, findChildrenOfType, walkTree,
} from '../tree-sitter/ast-utils.js';
import { extractRawComments, findCommentForNode } from '../tree-sitter/comment-extractor.js';
import { parseDoxygenComment } from './doxygen-parser.js';
import { CExtractor } from './c-extractor.js';

export class CppExtractor extends CExtractor {
  override readonly language = 'cpp' as const;
  override readonly supportedExtensions = ['.cpp', '.cc', '.cxx', '.hpp', '.h'];

  constructor(parserManager: ParserManager) {
    super(parserManager);
  }

  override async extract(context: ExtractionContext): Promise<ExtractionResult> {
    // Re-parse with C++ grammar
    const cppContext = { ...context, language: 'cpp' as const };

    const parser = await (this as any).parserManager.getParser('cpp');
    const tree = (this as any).parserManager.parse(context.source, parser);
    const comments = extractRawComments(tree.rootNode, context.source);

    const entries: DocEntry[] = [];
    const errors: Array<{ message: string; line?: number }> = [];

    // Walk tree and extract all supported node types
    walkTree(tree.rootNode, (node) => {
      try {
        let entry: DocEntry | null = null;

        switch (node.type) {
          case 'function_definition':
          case 'declaration': {
            // Check if it's a function declaration
            const funcDecl = findChildOfType(node, 'function_declarator');
            if (funcDecl || node.type === 'function_definition') {
              entry = this.extractCppFunction(node, cppContext, comments);
            }
            break;
          }
          case 'class_specifier':
            entry = this.extractClass(node, cppContext, comments);
            if (entry) entries.push(entry);
            // Also extract class methods
            entries.push(...this.extractClassMembers(node, cppContext, comments));
            return false; // don't recurse into class body for top-level scan
          case 'struct_specifier': {
            if (node.parent?.type !== 'type_definition') {
              entry = this.extractCppStruct(node, cppContext, comments);
            }
            break;
          }
          case 'namespace_definition':
            entry = this.extractNamespace(node, cppContext, comments);
            break;
          case 'template_declaration':
            entry = this.extractTemplate(node, cppContext, comments);
            if (entry) entries.push(entry);
            return false; // don't double-process template content
          case 'enum_specifier':
            if (node.parent?.type !== 'type_definition') {
              entry = this.extractCppEnum(node, cppContext, comments);
            }
            break;
          case 'type_definition':
            entry = this.extractCppTypedef(node, cppContext, comments);
            break;
        }

        if (entry) entries.push(entry);
      } catch (e) {
        errors.push({ message: (e as Error).message, line: node.startPosition.row + 1 });
      }
    });

    return { entries, errors };
  }

  private extractCppFunction(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const funcDecl = findChildOfType(node, 'function_declarator')
      ?? this.findDeepFunctionDeclarator(node);
    if (!funcDecl) return null;

    const nameNode = funcDecl.childForFieldName('declarator')
      ?? findChildOfType(funcDecl, 'identifier')
      ?? findChildOfType(funcDecl, 'field_identifier')
      ?? findChildOfType(funcDecl, 'qualified_identifier')
      ?? findChildOfType(funcDecl, 'destructor_name');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const params = this.extractParams(funcDecl, context.source);
    const comment = findCommentForNode(node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    if (docComment) {
      for (const p of params) {
        const dp = docComment.params.find(d => d.name === p.name);
        if (dp?.description) p.description = dp.description;
      }
    }

    const isVirtual = getNodeText(node, context.source).includes('virtual ');
    const isOverride = getNodeText(node, context.source).includes(' override');
    const isStatic = getNodeText(node, context.source).includes('static ');

    return {
      name,
      kind: name.startsWith('~') ? 'destructor' : 'function',
      language: 'cpp',
      signature: extractSignature(node, context.source),
      description: docComment?.brief || docComment?.description,
      params,
      returnType: docComment?.returns,
      throws: docComment?.throws ?? [],
      examples: [],
      tags: docComment?.tags,
      visibility: this.getVisibility(node),
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
      isVirtual,
      isOverride,
      isStatic,
    };
  }

  private findDeepFunctionDeclarator(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
    let result: Parser.SyntaxNode | null = null;
    walkTree(node, (n) => {
      if (n.type === 'function_declarator') {
        result = n;
        return false;
      }
    });
    return result;
  }

  private extractClass(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = node.childForFieldName('name')
      ?? findChildOfType(node, 'type_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node.parent ?? node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    return {
      name,
      kind: 'class',
      language: 'cpp',
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

  private extractClassMembers(
    classNode: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry[] {
    const entries: DocEntry[] = [];
    const className = getNodeText(
      classNode.childForFieldName('name') ?? findChildOfType(classNode, 'type_identifier')!,
      context.source,
    );

    const body = findChildOfType(classNode, 'field_declaration_list');
    if (!body) return entries;

    let currentVisibility: Visibility = 'private'; // C++ classes default to private

    for (let i = 0; i < body.childCount; i++) {
      const child = body.child(i);
      if (!child) continue;

      if (child.type === 'access_specifier') {
        const text = getNodeText(child, context.source).replace(':', '').trim();
        if (text === 'public' || text === 'private' || text === 'protected') {
          currentVisibility = text;
        }
        continue;
      }

      if (child.type === 'function_definition' || child.type === 'declaration' || child.type === 'field_declaration') {
        const funcDecl = findChildOfType(child, 'function_declarator')
          ?? this.findDeepFunctionDeclarator(child);
        if (funcDecl) {
          const entry = this.extractCppFunction(child, context, comments);
          if (entry) {
            entry.kind = 'method';
            entry.parentName = className;
            entry.visibility = currentVisibility;
            entries.push(entry);
          }
        }
      }
    }

    return entries;
  }

  private extractCppStruct(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = node.childForFieldName('name')
      ?? findChildOfType(node, 'type_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node.parent ?? node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    return {
      name,
      kind: 'struct',
      language: 'cpp',
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

  private extractNamespace(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = node.childForFieldName('name')
      ?? findChildOfType(node, 'identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    return {
      name,
      kind: 'namespace',
      language: 'cpp',
      signature: `namespace ${name}`,
      description: docComment?.brief || docComment?.description,
      params: [],
      throws: [],
      examples: [],
      tags: docComment?.tags,
      location: this.makeLocation(node, context.file),
      rawComment: comment?.text,
    };
  }

  private extractTemplate(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    // Extract template parameters
    const templateParamList = findChildOfType(node, 'template_parameter_list');
    const templateParams: string[] = [];
    if (templateParamList) {
      for (let i = 0; i < templateParamList.childCount; i++) {
        const param = templateParamList.child(i);
        if (param && param.type !== ',' && param.type !== '<' && param.type !== '>') {
          templateParams.push(getNodeText(param, context.source));
        }
      }
    }

    // Get the actual declaration inside the template (skip keywords and punctuation)
    let inner: Parser.SyntaxNode | null = null;
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type !== 'template_parameter_list' && child.type !== 'template' && child.type !== ';' && child.type !== '<' && child.type !== '>') {
        inner = child;
      }
    }
    if (!inner) return null;

    let entry: DocEntry | null = null;
    if (inner.type === 'function_definition' || inner.type === 'declaration') {
      entry = this.extractCppFunction(inner, context, comments);
    } else if (inner.type === 'class_specifier') {
      entry = this.extractClass(inner, context, comments);
    }

    if (entry) {
      entry.templateParams = templateParams;
      entry.signature = extractSignature(node, context.source);
    }

    return entry;
  }

  private extractCppEnum(
    node: Parser.SyntaxNode,
    context: ExtractionContext,
    comments: ReturnType<typeof extractRawComments>,
  ): DocEntry | null {
    const nameNode = node.childForFieldName('name')
      ?? findChildOfType(node, 'type_identifier');
    if (!nameNode) return null;

    const name = getNodeText(nameNode, context.source);
    const comment = findCommentForNode(node.parent ?? node, comments);
    const docComment = comment ? parseDoxygenComment(comment.text) : undefined;

    return {
      name,
      kind: 'enum',
      language: 'cpp',
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

  private extractCppTypedef(
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
      language: 'cpp',
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

  private getVisibility(node: Parser.SyntaxNode): Visibility | undefined {
    // Check for explicit access specifier in surrounding context
    const text = getNodeText(node, '').trim();
    if (text.startsWith('public ')) return 'public';
    if (text.startsWith('private ')) return 'private';
    if (text.startsWith('protected ')) return 'protected';
    return undefined;
  }
}
