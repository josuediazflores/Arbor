import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { KotlinExtractor } from '../../src/core/parsers/kotlin/kotlin-extractor.js';
import { ParserManager } from '../../src/core/parsers/tree-sitter/parser-manager.js';

describe('KotlinExtractor', () => {
  let extractor: KotlinExtractor;
  let parserManager: ParserManager;

  beforeAll(() => {
    parserManager = new ParserManager();
    extractor = new KotlinExtractor(parserManager);
  });

  it('extracts classes, functions, and objects from Kotlin', async () => {
    const source = await fs.readFile(
      path.join(import.meta.dirname, '../fixtures/kotlin/UserRepository.kt'),
      'utf-8',
    );

    const result = await extractor.extract({
      file: 'UserRepository.kt',
      source,
      language: 'kotlin',
    });

    expect(result.errors).toHaveLength(0);

    // Should find data class User
    const user = result.entries.find(e => e.name === 'User' && e.kind === 'class');
    expect(user).toBeDefined();

    // Should find UserRepository class
    const repo = result.entries.find(e => e.name === 'UserRepository' && e.kind === 'class');
    expect(repo).toBeDefined();

    // Should find methods
    const findById = result.entries.find(e => e.name === 'findById');
    expect(findById).toBeDefined();
    expect(findById!.kind).toBe('method');
    expect(findById!.parentName).toBe('UserRepository');
    expect(findById!.params).toHaveLength(1);
    expect(findById!.params[0].name).toBe('id');
    expect(findById!.description).toContain('Find a user');

    const save = result.entries.find(e => e.name === 'save');
    expect(save).toBeDefined();

    // Should find sealed class
    const userResult = result.entries.find(e => e.name === 'UserResult');
    expect(userResult).toBeDefined();

    // Should find companion object method
    const inMemory = result.entries.find(e => e.name === 'inMemory');
    expect(inMemory).toBeDefined();
    expect(inMemory!.isStatic).toBe(true);
  });
});
