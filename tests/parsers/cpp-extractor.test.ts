import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { CppExtractor } from '../../src/core/parsers/c-cpp/cpp-extractor.js';
import { ParserManager } from '../../src/core/parsers/tree-sitter/parser-manager.js';

describe('CppExtractor', () => {
  let extractor: CppExtractor;
  let parserManager: ParserManager;

  beforeAll(() => {
    parserManager = new ParserManager();
    extractor = new CppExtractor(parserManager);
  });

  it('extracts classes and methods from C++ header', async () => {
    const source = await fs.readFile(
      path.join(import.meta.dirname, '../fixtures/cpp/shape.hpp'),
      'utf-8',
    );

    const result = await extractor.extract({
      file: 'shape.hpp',
      source,
      language: 'cpp',
    });

    expect(result.errors).toHaveLength(0);

    // Should find namespace
    const ns = result.entries.find(e => e.kind === 'namespace');
    expect(ns).toBeDefined();
    expect(ns!.name).toBe('Geometry');

    // Should find classes
    const shapeClass = result.entries.find(e => e.name === 'Shape' && e.kind === 'class');
    expect(shapeClass).toBeDefined();

    const circleClass = result.entries.find(e => e.name === 'Circle' && e.kind === 'class');
    expect(circleClass).toBeDefined();

    // Should find methods
    const areaMethod = result.entries.find(e => e.name === 'area' && e.kind === 'method');
    expect(areaMethod).toBeDefined();

    // Should find template class
    const templateClass = result.entries.find(e => e.name === 'ShapeCollection');
    expect(templateClass).toBeDefined();
    expect(templateClass!.templateParams).toBeDefined();

    // Should find enum class
    const direction = result.entries.find(e => e.name === 'Direction' && e.kind === 'enum');
    expect(direction).toBeDefined();
  });
});
