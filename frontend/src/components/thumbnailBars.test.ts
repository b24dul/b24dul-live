import { describe, expect, it } from 'vitest';
import { sideBarFraction } from './thumbnailBars';

/** A width x height RGBA picture: black where `isBar(x)`, mid-grey elsewhere. */
function picture(width: number, height: number, isBar: (x: number) => boolean) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = isBar(x) ? 0 : 140;
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  return data;
}

describe('thumbnail side bars', () => {
  it('measures black bars on both sides', () => {
    expect(
      sideBarFraction(
        picture(64, 48, (x) => x < 8 || x >= 56),
        64,
        48,
      ),
    ).toBe(8 / 64);
  });

  it('uses the narrower side when the bars differ', () => {
    expect(
      sideBarFraction(
        picture(64, 48, (x) => x < 10 || x >= 58),
        64,
        48,
      ),
    ).toBe(6 / 64);
  });

  it('leaves ordinary pictures, one-sided dark areas and black pictures alone', () => {
    expect(
      sideBarFraction(
        picture(64, 48, () => false),
        64,
        48,
      ),
    ).toBe(0);
    expect(
      sideBarFraction(
        picture(64, 48, (x) => x < 12),
        64,
        48,
      ),
    ).toBe(0);
    expect(
      sideBarFraction(
        picture(64, 48, () => true),
        64,
        48,
      ),
    ).toBe(0);
  });

  it('never zooms by more than the cap', () => {
    expect(
      sideBarFraction(
        picture(64, 48, (x) => x < 28 || x >= 36),
        64,
        48,
      ),
    ).toBe(0.3);
  });
});
