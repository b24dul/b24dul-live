// Every 2048 tile and every Sudoku cell style must keep readable text (WCAG AA, 4.5:1).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/index.css', 'utf8');
const palette: Record<string, string> = {
  '--violet': '#8b3dff',
  '--coral': '#ff4f7a',
  '--text': '#f5f3fa',
  '--warning': '#ffcf8a',
};

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((part) => parseInt(part, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
/** Rules with both a background and a text colour: [selector, background colours, text colour]. */
function pairs(prefix: string) {
  const found: [string, string[], string][] = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const name = selector!.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!name.startsWith(prefix)) continue;
    const background = /background:([^;]+);/.exec(body!)?.[1];
    const color = /(?:^|\s)color:\s*([^;]+);/.exec(body!)?.[1]?.trim();
    if (!background || !color || color === 'transparent') continue;
    const resolve = (value: string) => palette[/var\((--[\w-]+)\)/.exec(value)?.[1] ?? ''] ?? value;
    const backgrounds: string[] = [...(background.match(/#[0-9a-f]{6}/gi) ?? [])].concat(
      background.includes('var(') ? [resolve(background)] : [],
    );
    found.push([name, backgrounds, resolve(color)]);
  }
  return found;
}

describe('game colours', () => {
  it('gives each 2048 tile value its own colour with AA-readable text', () => {
    const tiles = pairs('.g2-tile[data-v=');
    const values = tiles.map(([selector]) => /data-v='(\w+)'/.exec(selector)![1]);
    expect(values).toEqual([
      '2',
      '4',
      '8',
      '16',
      '32',
      '64',
      '128',
      '256',
      '512',
      '1024',
      '2048',
      'big',
    ]);
    expect(new Set(tiles.map(([, backgrounds]) => backgrounds.join())).size).toBe(tiles.length);
    for (const [selector, backgrounds, color] of tiles)
      for (const background of backgrounds)
        expect(contrast(background, color), selector).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every Sudoku cell style AA-readable', () => {
    const cells = pairs('.sd-cell');
    expect(cells.length).toBeGreaterThanOrEqual(5);
    for (const [selector, backgrounds, color] of cells)
      for (const background of backgrounds)
        expect(contrast(background, color), selector).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps light Sudoku text readable on every dark cell highlight it can sit on', () => {
    const rules = [...css.matchAll(/\.sd-cell[^{]*\{([^}]*)\}/g)].map(([, body]) => body!);
    const hex = (pattern: RegExp) =>
      new Set(rules.flatMap((body) => [...body.matchAll(pattern)].map((m) => m[1]!.toLowerCase())));
    const darkBackgrounds = [...hex(/background:\s*(#[0-9a-f]{6})/gi)].filter(
      (bg) => luminance(bg) < 0.05,
    );
    const lightText = [...hex(/(?:^|\s)color:\s*(#[0-9a-f]{6})/gi), '#f5f3fa', '#ffcf8a'].filter(
      (color) => luminance(color) > 0.3,
    );
    expect(darkBackgrounds.length).toBeGreaterThanOrEqual(5);
    for (const background of darkBackgrounds)
      for (const color of lightText)
        expect(contrast(background, color), `${color} on ${background}`).toBeGreaterThanOrEqual(
          4.5,
        );
  });
});
