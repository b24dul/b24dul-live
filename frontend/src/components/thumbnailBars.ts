/**
 * Some YouTube thumbnails (e.g. the placeholder shown for streams) have black bars baked into
 * the picture itself, so cropping alone can't remove them. This measures dark side bars in the
 * part of the thumbnail that shows in the 16:9 frame, so the card can zoom just enough to fill it.
 */
const SAMPLE_WIDTH = 64;
const SAMPLE_HEIGHT = 48;
const DARK = 20; // average 0-255 brightness of a column that counts as "bar"
const MAX_BAR = 0.3;

/** Width of the narrower dark side bar, as a fraction of the width (0 when there is none). */
export function sideBarFraction(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  rows: [number, number] = [0, height],
): number {
  const columnBrightness = (x: number) => {
    let total = 0;
    for (let y = rows[0]; y < rows[1]; y++) {
      const i = (y * width + x) * 4;
      total += (rgba[i]! + rgba[i + 1]! + rgba[i + 2]!) / 3;
    }
    return total / (rows[1] - rows[0]);
  };
  const columns = Array.from({ length: width }, (_, x) => columnBrightness(x));
  let left = 0;
  while (left < width && columns[left]! < DARK) left++;
  let right = 0;
  while (right < width && columns[width - 1 - right]! < DARK) right++;
  const bar = Math.min(left, right);
  if (bar < 2 || bar * 2 >= width) return 0; // no bars, or a nearly black picture
  return Math.min(bar / width, MAX_BAR);
}

/** Zoom that removes the bars (1 when there are none or the image can't be read). */
export function thumbnailZoom(image: HTMLImageElement): number {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || !image.naturalWidth) return 1;
    context.drawImage(image, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    // hqdefault is 4:3; only the middle 16:9 band shows in the card.
    const band = Math.round((SAMPLE_HEIGHT * (1 - 0.75)) / 2);
    const fraction = sideBarFraction(data, SAMPLE_WIDTH, SAMPLE_HEIGHT, [
      band,
      SAMPLE_HEIGHT - band,
    ]);
    return fraction > 0 ? 1 / (1 - 2 * fraction) : 1;
  } catch {
    return 1; // canvas unavailable or image not readable: leave it as it is
  }
}
