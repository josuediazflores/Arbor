import { describe, it, expect } from 'vitest';
import { DocEntrySchema, DocGenConfigSchema } from '../../src/shared/schema.js';

describe('DocEntrySchema', () => {
  const validEntry = {
    name: 'add',
    kind: 'function',
    language: 'c',
    signature: 'int add(int a, int b)',
    params: [
      { name: 'a', type: 'int' },
      { name: 'b', type: 'int' },
    ],
    throws: [],
    examples: [],
    location: { file: 'math.c', line: 1, column: 1 },
  };

  it('accepts valid DocEntry', () => {
    const result = DocEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it('accepts DocEntry with all optional fields', () => {
    const full = {
      ...validEntry,
      description: 'Adds two numbers',
      returnType: { type: 'int', description: 'The sum' },
      visibility: 'public',
      rawComment: '/** Adds two numbers */',
      edgeCases: ['Overflow on large values'],
      related: ['subtract'],
      tags: ['math'],
      parentName: 'MathUtils',
      isStatic: true,
    };
    const result = DocEntrySchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = DocEntrySchema.safeParse({ ...validEntry, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid kind', () => {
    const result = DocEntrySchema.safeParse({ ...validEntry, kind: 'foobar' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid language', () => {
    const result = DocEntrySchema.safeParse({ ...validEntry, language: 'python' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = DocEntrySchema.safeParse({ name: 'add' });
    expect(result.success).toBe(false);
  });
});

describe('DocGenConfigSchema', () => {
  it('provides sane defaults', () => {
    const result = DocGenConfigSchema.parse({});
    expect(result.rootDir).toBe('.');
    expect(result.outputDir).toBe('./docs');
    expect(result.languages).toContain('c');
    expect(result.enrich).toBe(true);
    expect(result.concurrency).toBe(5);
  });

  it('accepts valid overrides', () => {
    const result = DocGenConfigSchema.parse({
      rootDir: '/my/project',
      languages: ['kotlin', 'swift'],
      enrich: false,
    });
    expect(result.rootDir).toBe('/my/project');
    expect(result.languages).toEqual(['kotlin', 'swift']);
    expect(result.enrich).toBe(false);
  });
});
