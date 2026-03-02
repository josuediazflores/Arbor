import type { SupportedLanguage } from './types.js';

export const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  '.c': 'c',
  '.h': 'c',     // ambiguous: resolved at parse time
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.swift': 'swift',
};

export const LANGUAGE_EXTENSIONS: Record<SupportedLanguage, string[]> = {
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
  kotlin: ['.kt', '.kts'],
  swift: ['.swift'],
};

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  c: 'C',
  cpp: 'C++',
  kotlin: 'Kotlin',
  swift: 'Swift',
};

export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/build/**',
  '**/dist/**',
  '**/.git/**',
  '**/vendor/**',
  '**/Pods/**',
  '**/.gradle/**',
  '**/DerivedData/**',
];
