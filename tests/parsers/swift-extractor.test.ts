import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { SwiftExtractor } from '../../src/core/parsers/swift/swift-extractor.js';
import { ParserManager } from '../../src/core/parsers/tree-sitter/parser-manager.js';

describe('SwiftExtractor', () => {
  let extractor: SwiftExtractor;
  let parserManager: ParserManager;

  beforeAll(() => {
    parserManager = new ParserManager();
    extractor = new SwiftExtractor(parserManager);
  });

  it('extracts declarations from Swift source', async () => {
    const source = await fs.readFile(
      path.join(import.meta.dirname, '../fixtures/swift/NetworkManager.swift'),
      'utf-8',
    );

    const result = await extractor.extract({
      file: 'NetworkManager.swift',
      source,
      language: 'swift',
    });

    // Should find enum
    const networkError = result.entries.find(e => e.name === 'NetworkError' && e.kind === 'enum');
    expect(networkError).toBeDefined();

    // Should find protocol
    const service = result.entries.find(e => e.name === 'NetworkService' && e.kind === 'protocol');
    expect(service).toBeDefined();

    // Should find class
    const manager = result.entries.find(e => e.name === 'NetworkManager' && e.kind === 'class');
    expect(manager).toBeDefined();

    // Should find functions
    const fetchFn = result.entries.find(e => e.name === 'fetch' && e.kind === 'function');
    expect(fetchFn).toBeDefined();
    expect(fetchFn!.params.length).toBeGreaterThan(0);

    // Should find init
    const initFn = result.entries.find(e => e.kind === 'constructor');
    expect(initFn).toBeDefined();

    // Should find struct
    const response = result.entries.find(e => e.name === 'PaginatedResponse' && e.kind === 'struct');
    expect(response).toBeDefined();

    // Should find clearCache
    const clearCache = result.entries.find(e => e.name === 'clearCache');
    expect(clearCache).toBeDefined();
  });
});
