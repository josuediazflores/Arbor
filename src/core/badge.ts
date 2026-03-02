export type BadgeStyle = 'flat' | 'flat-square' | 'plastic';

export interface BadgeOptions {
  label?: string;
  value: string;
  color?: string;
  style?: BadgeStyle;
}

export function coverageColor(percentage: number): string {
  if (percentage >= 80) return '#4c1';
  if (percentage >= 50) return '#dfb317';
  return '#e05d44';
}

export function generateBadgeSvg(options: BadgeOptions): string {
  const label = options.label ?? 'docs';
  const value = options.value;
  const color = options.color ?? '#4c1';
  const style = options.style ?? 'flat';

  const CHAR_WIDTH = 6.5;
  const PADDING = 10;
  const HEIGHT = 20;

  const labelWidth = Math.round(label.length * CHAR_WIDTH) + PADDING * 2;
  const valueWidth = Math.round(value.length * CHAR_WIDTH) + PADDING * 2;
  const totalWidth = labelWidth + valueWidth;

  const labelBg = '#555';
  const labelX = labelWidth / 2;
  const valueX = labelWidth + valueWidth / 2;
  const textY = 14;
  const shadowY = 15;

  let rx: number;
  switch (style) {
    case 'flat-square': rx = 0; break;
    case 'plastic': rx = 4; break;
    default: rx = 3; break;
  }

  const gradientOverlay = style === 'plastic'
    ? `<linearGradient id="grad" x2="0" y2="100%">
      <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
      <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
      <stop offset=".9" stop-color="#000" stop-opacity=".3"/>
      <stop offset="1" stop-color="#000" stop-opacity=".5"/>
    </linearGradient>
    <rect rx="${rx}" width="${totalWidth}" height="${HEIGHT}" fill="url(#grad)"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${HEIGHT}">
  <rect rx="${rx}" width="${totalWidth}" height="${HEIGHT}" fill="${labelBg}"/>
  <rect rx="${rx}" x="${labelWidth}" width="${valueWidth}" height="${HEIGHT}" fill="${color}"/>
  <rect rx="${rx}" width="${totalWidth}" height="${HEIGHT}" fill="url(#smooth)"/>
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  ${gradientOverlay}
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelX}" y="${shadowY}" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelX}" y="${textY}">${label}</text>
    <text x="${valueX}" y="${shadowY}" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${valueX}" y="${textY}">${value}</text>
  </g>
</svg>`;
}
