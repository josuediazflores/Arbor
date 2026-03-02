import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { CExtractor } from '../../src/core/parsers/c-cpp/c-extractor.js';
import { ParserManager } from '../../src/core/parsers/tree-sitter/parser-manager.js';

describe('CExtractor', () => {
  let extractor: CExtractor;
  let parserManager: ParserManager;

  beforeAll(() => {
    parserManager = new ParserManager();
    extractor = new CExtractor(parserManager);
  });

  it('extracts functions from C source', async () => {
    const source = await fs.readFile(
      path.join(import.meta.dirname, '../fixtures/c/math_utils.c'),
      'utf-8',
    );

    const result = await extractor.extract({
      file: 'math_utils.c',
      source,
      language: 'c',
    });

    expect(result.errors).toHaveLength(0);

    const addFn = result.entries.find(e => e.name === 'add');
    expect(addFn).toBeDefined();
    expect(addFn!.kind).toBe('function');
    expect(addFn!.language).toBe('c');
    expect(addFn!.params).toHaveLength(2);
    expect(addFn!.params[0].name).toBe('a');
    expect(addFn!.params[0].type).toBe('int');
    expect(addFn!.description).toContain('Adds two integers');

    const factFn = result.entries.find(e => e.name === 'factorial');
    expect(factFn).toBeDefined();
    expect(factFn!.params).toHaveLength(1);
    expect(factFn!.params[0].name).toBe('n');
  });

  it('extracts from header files', async () => {
    const source = await fs.readFile(
      path.join(import.meta.dirname, '../fixtures/c/math_utils.h'),
      'utf-8',
    );

    const result = await extractor.extract({
      file: 'math_utils.h',
      source,
      language: 'c',
    });

    // Should find function declarations, struct, and enum
    const names = result.entries.map(e => e.name);
    expect(names).toContain('add');
    expect(names).toContain('factorial');

    // Should find typedef struct
    const pointEntry = result.entries.find(e => e.name === 'Point');
    expect(pointEntry).toBeDefined();
    expect(pointEntry!.kind).toBe('typedef');
  });

  it('parses Doxygen comments correctly', async () => {
    const source = `
/**
 * @brief Calculate the distance between two points.
 * @param x1 The x coordinate of the first point.
 * @param y1 The y coordinate of the first point.
 * @param x2 The x coordinate of the second point.
 * @param y2 The y coordinate of the second point.
 * @return The Euclidean distance.
 */
double distance(double x1, double y1, double x2, double y2) {
    return 0.0;
}
`;

    const result = await extractor.extract({
      file: 'test.c',
      source,
      language: 'c',
    });

    const fn = result.entries.find(e => e.name === 'distance');
    expect(fn).toBeDefined();
    expect(fn!.description).toContain('distance');
    expect(fn!.params).toHaveLength(4);
    expect(fn!.params[0].description).toContain('x coordinate');
    expect(fn!.returnType?.description).toContain('Euclidean distance');
  });
});
