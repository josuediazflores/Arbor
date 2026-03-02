import { describe, it, expect } from 'vitest';
import { parseEnrichmentResponse } from '../../src/core/ai/response-parser.js';

describe('parseEnrichmentResponse', () => {
  it('parses valid JSON response', () => {
    const response = JSON.stringify({
      description: 'Adds two numbers together.',
      paramDescriptions: { a: 'First number', b: 'Second number' },
      returnDescription: 'The sum of a and b.',
      examples: [{ code: 'add(1, 2) // returns 3', description: 'Basic addition' }],
      edgeCases: ['Integer overflow for large values'],
      tags: ['math', 'arithmetic'],
    });

    const result = parseEnrichmentResponse(response);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('Adds two numbers together.');
    expect(result!.paramDescriptions?.a).toBe('First number');
    expect(result!.examples).toHaveLength(1);
    expect(result!.edgeCases).toHaveLength(1);
  });

  it('handles markdown-wrapped JSON', () => {
    const response = '```json\n{"description": "A function."}\n```';
    const result = parseEnrichmentResponse(response);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('A function.');
  });

  it('handles JSON embedded in text', () => {
    const response = 'Here is the documentation:\n\n{"description": "A function."}\n\nDone.';
    const result = parseEnrichmentResponse(response);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('A function.');
  });

  it('returns null for completely invalid input', () => {
    const result = parseEnrichmentResponse('This is not JSON at all');
    expect(result).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const result = parseEnrichmentResponse('{"description": }');
    expect(result).toBeNull();
  });

  it('strips unknown fields', () => {
    const response = JSON.stringify({
      description: 'A function.',
      unknownField: 'should be ignored',
    });
    const result = parseEnrichmentResponse(response);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('A function.');
    expect((result as any).unknownField).toBeUndefined();
  });
});
