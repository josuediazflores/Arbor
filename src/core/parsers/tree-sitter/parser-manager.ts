import Parser from 'tree-sitter';
import type { SupportedLanguage } from '../../../shared/types.js';
import { ParseError } from '../../../shared/errors.js';

export class ParserManager {
  private parsers = new Map<string, Parser>();
  private grammars = new Map<string, Parser.Language>();

  async getParser(language: SupportedLanguage | string): Promise<Parser> {
    const cached = this.parsers.get(language);
    if (cached) return cached;

    const grammar = await this.loadGrammar(language);
    const parser = new Parser();
    parser.setLanguage(grammar);
    this.parsers.set(language, parser);
    return parser;
  }

  private async loadGrammar(language: string): Promise<Parser.Language> {
    const cached = this.grammars.get(language);
    if (cached) return cached;

    let grammar: Parser.Language;
    try {
      switch (language) {
        case 'c': {
          const mod = await import('tree-sitter-c');
          grammar = (mod.default ?? mod) as Parser.Language;
          break;
        }
        case 'cpp': {
          const mod = await import('tree-sitter-cpp');
          grammar = (mod.default ?? mod) as Parser.Language;
          break;
        }
        case 'kotlin': {
          const mod = await import('tree-sitter-kotlin');
          grammar = (mod.default ?? mod) as Parser.Language;
          break;
        }
        case 'swift': {
          const mod = await import('tree-sitter-swift');
          grammar = (mod.default ?? mod) as Parser.Language;
          break;
        }
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
    } catch (err) {
      throw new ParseError(
        `Failed to load grammar for ${language}: ${(err as Error).message}`,
        `<grammar:${language}>`,
        err as Error,
      );
    }

    this.grammars.set(language, grammar);
    return grammar;
  }

  parse(source: string, parser: Parser): Parser.Tree {
    return parser.parse(source);
  }

  isLanguageAvailable(language: string): boolean {
    try {
      switch (language) {
        case 'c':
        case 'cpp':
        case 'kotlin':
          return true;
        case 'swift':
          try {
            require.resolve('tree-sitter-swift');
            return true;
          } catch {
            return false;
          }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}
