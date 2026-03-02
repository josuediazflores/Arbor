export { DocGenEngineImpl } from './core/engine.js';
export type {
  DocEntry, DocGenConfig, SupportedLanguage,
  ScanResult, GenerateResult, ScanStats,
} from './shared/types.js';
export { loadConfig, getDefaultConfig } from './shared/config.js';
export { ParserManager } from './core/parsers/tree-sitter/parser-manager.js';
export { ExtractorRegistry } from './core/parsers/registry.js';
