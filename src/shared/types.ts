export type SupportedLanguage = 'c' | 'cpp' | 'kotlin' | 'swift';

export type DocEntryKind =
  | 'function'
  | 'method'
  | 'class'
  | 'struct'
  | 'enum'
  | 'protocol'
  | 'extension'
  | 'typedef'
  | 'namespace'
  | 'property'
  | 'object'
  | 'constructor'
  | 'destructor';

export type Visibility = 'public' | 'private' | 'protected' | 'internal' | 'fileprivate' | 'open';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface ParamEntry {
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
  isVariadic?: boolean;
  isOptional?: boolean;
}

export interface ReturnEntry {
  type: string;
  description?: string;
}

export interface ThrowsEntry {
  type?: string;
  description?: string;
}

export interface ExampleEntry {
  code: string;
  language: string;
  description?: string;
}

export interface DocEntry {
  name: string;
  kind: DocEntryKind;
  language: SupportedLanguage;
  signature: string;
  description?: string;
  params: ParamEntry[];
  returnType?: ReturnEntry;
  throws: ThrowsEntry[];
  examples: ExampleEntry[];
  edgeCases?: string[];
  related?: string[];
  tags?: string[];
  visibility?: Visibility;
  location: SourceLocation;
  rawComment?: string;
  parentName?: string;
  templateParams?: string[];
  isStatic?: boolean;
  isVirtual?: boolean;
  isOverride?: boolean;
  isAsync?: boolean;
  genericParams?: string[];
  modifiers?: string[];
}

export interface ScanResult {
  entries: DocEntry[];
  stats: ScanStats;
  files: string[];
}

export interface ScanStats {
  totalFiles: number;
  totalEntries: number;
  byLanguage: Record<SupportedLanguage, number>;
  byKind: Record<string, number>;
  documentedCount: number;
  undocumentedCount: number;
}

export interface GenerateResult {
  outputDir: string;
  filesWritten: string[];
  totalEntries: number;
  enrichedCount: number;
}

export interface DocGenConfig {
  rootDir: string;
  outputDir: string;
  languages: SupportedLanguage[];
  include: string[];
  exclude: string[];
  enrich: boolean;
  anthropicApiKey?: string;
  model?: string;
  concurrency?: number;
  skipDocumented?: boolean;
  templateDir?: string;
  title?: string;
}
