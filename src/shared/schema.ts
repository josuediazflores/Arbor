import { z } from 'zod';

export const SupportedLanguageSchema = z.enum(['c', 'cpp', 'kotlin', 'swift']);

export const DocEntryKindSchema = z.enum([
  'function', 'method', 'class', 'struct', 'enum', 'protocol',
  'extension', 'typedef', 'namespace', 'property', 'object',
  'constructor', 'destructor',
]);

export const VisibilitySchema = z.enum([
  'public', 'private', 'protected', 'internal', 'fileprivate', 'open',
]);

export const SourceLocationSchema = z.object({
  file: z.string(),
  line: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  endLine: z.number().int().nonnegative().optional(),
  endColumn: z.number().int().nonnegative().optional(),
});

export const ParamEntrySchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  isVariadic: z.boolean().optional(),
  isOptional: z.boolean().optional(),
});

export const ReturnEntrySchema = z.object({
  type: z.string(),
  description: z.string().optional(),
});

export const ThrowsEntrySchema = z.object({
  type: z.string().optional(),
  description: z.string().optional(),
});

export const ExampleEntrySchema = z.object({
  code: z.string(),
  language: z.string(),
  description: z.string().optional(),
});

export const DocEntrySchema = z.object({
  name: z.string().min(1),
  kind: DocEntryKindSchema,
  language: SupportedLanguageSchema,
  signature: z.string(),
  description: z.string().optional(),
  params: z.array(ParamEntrySchema),
  returnType: ReturnEntrySchema.optional(),
  throws: z.array(ThrowsEntrySchema),
  examples: z.array(ExampleEntrySchema),
  edgeCases: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  visibility: VisibilitySchema.optional(),
  location: SourceLocationSchema,
  rawComment: z.string().optional(),
  parentName: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
  isStatic: z.boolean().optional(),
  isVirtual: z.boolean().optional(),
  isOverride: z.boolean().optional(),
  isAsync: z.boolean().optional(),
  genericParams: z.array(z.string()).optional(),
  modifiers: z.array(z.string()).optional(),
});

export const SnapshotEntrySchema = z.object({
  key: z.string(),
  name: z.string(),
  kind: DocEntryKindSchema,
  language: SupportedLanguageSchema,
  signature: z.string(),
  documented: z.boolean(),
  paramCount: z.number().int().nonnegative(),
  visibility: VisibilitySchema.optional(),
  parentName: z.string().optional(),
});

export const ScanStatsSchema = z.object({
  totalFiles: z.number().int().nonnegative(),
  totalEntries: z.number().int().nonnegative(),
  byLanguage: z.record(z.number().int().nonnegative()),
  byKind: z.record(z.number().int().nonnegative()),
  documentedCount: z.number().int().nonnegative(),
  undocumentedCount: z.number().int().nonnegative(),
});

export const SnapshotSchema = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  rootDir: z.string(),
  entries: z.record(SnapshotEntrySchema),
  stats: ScanStatsSchema,
});

export const DocGenConfigSchema = z.object({
  rootDir: z.string().default('.'),
  outputDir: z.string().default('./docs'),
  languages: z.array(SupportedLanguageSchema).default(['c', 'cpp', 'kotlin', 'swift']),
  include: z.array(z.string()).default(['**/*']),
  exclude: z.array(z.string()).default(['**/node_modules/**', '**/build/**', '**/dist/**', '**/.git/**']),
  enrich: z.boolean().default(true),
  anthropicApiKey: z.string().optional(),
  model: z.string().default('claude-sonnet-4-5-20250929'),
  concurrency: z.number().int().positive().default(5),
  skipDocumented: z.boolean().default(false),
  templateDir: z.string().optional(),
  title: z.string().default('API Documentation'),
});
