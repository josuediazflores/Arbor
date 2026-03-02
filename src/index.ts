export { DocGenEngineImpl } from './core/engine.js';
export type {
  DocEntry, DocGenConfig, SupportedLanguage,
  ScanResult, GenerateResult, ScanStats,
  Snapshot, SnapshotEntry, DiffResult, DiffChange, DiffChangeKind,
} from './shared/types.js';
export { loadConfig, getDefaultConfig } from './shared/config.js';
export { ParserManager } from './core/parsers/tree-sitter/parser-manager.js';
export { ExtractorRegistry } from './core/parsers/registry.js';
export { createSnapshot, saveSnapshot, loadSnapshot, computeDiff } from './core/snapshot.js';
export { generateBadgeSvg, coverageColor } from './core/badge.js';
export type { BadgeOptions, BadgeStyle } from './core/badge.js';
