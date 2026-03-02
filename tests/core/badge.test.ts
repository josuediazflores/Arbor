import { describe, it, expect } from 'vitest';
import { coverageColor, generateBadgeSvg } from '../../src/core/badge.js';

describe('coverageColor', () => {
  it('returns green for >= 80%', () => {
    expect(coverageColor(80)).toBe('#4c1');
    expect(coverageColor(100)).toBe('#4c1');
  });

  it('returns yellow for >= 50% and < 80%', () => {
    expect(coverageColor(79)).toBe('#dfb317');
    expect(coverageColor(50)).toBe('#dfb317');
  });

  it('returns red for < 50%', () => {
    expect(coverageColor(49)).toBe('#e05d44');
    expect(coverageColor(0)).toBe('#e05d44');
  });
});

describe('generateBadgeSvg', () => {
  it('produces valid SVG', () => {
    const svg = generateBadgeSvg({ value: '72%' });
    expect(svg.trimStart()).toMatch(/^<svg/);
    expect(svg.trimEnd()).toMatch(/<\/svg>$/);
  });

  it('contains label and value text', () => {
    const svg = generateBadgeSvg({ label: 'coverage', value: '85%' });
    expect(svg).toContain('coverage');
    expect(svg).toContain('85%');
  });

  it('uses default label "docs"', () => {
    const svg = generateBadgeSvg({ value: '50%' });
    expect(svg).toContain('docs');
  });

  it('flat style produces rx=3', () => {
    const svg = generateBadgeSvg({ value: '50%', style: 'flat' });
    expect(svg).toContain('rx="3"');
  });

  it('flat-square style produces rx=0', () => {
    const svg = generateBadgeSvg({ value: '50%', style: 'flat-square' });
    expect(svg).toContain('rx="0"');
  });

  it('plastic style produces rx=4', () => {
    const svg = generateBadgeSvg({ value: '50%', style: 'plastic' });
    expect(svg).toContain('rx="4"');
  });

  it('width scales with text length', () => {
    const shortSvg = generateBadgeSvg({ label: 'a', value: 'b' });
    const longSvg = generateBadgeSvg({ label: 'documentation', value: '100%' });

    const getWidth = (svg: string) => {
      const match = svg.match(/width="(\d+)"/);
      return match ? parseInt(match[1], 10) : 0;
    };

    expect(getWidth(longSvg)).toBeGreaterThan(getWidth(shortSvg));
  });
});
