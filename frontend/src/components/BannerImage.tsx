// Same base path as vite.config.ts (the site lives at /b24dul-live/).
const base = '/b24dul-live/';
const set = (name: string, widths: number[], ext: string) =>
  widths.map((width) => `${base}banner/${name}-${width}.${ext} ${width}w`).join(', ');

const WIDE = [640, 960, 1280, 1600, 2172];
const PHONE = [480, 720, 960];
const PHONE_MEDIA = '(max-width: 640px)';
const WIDE_SIZES = '(min-width: 1400px) 1340px, 96vw';

/**
 * The B24DUL banner, used only in the home hero and the Watch page's offline state.
 * Phones get a crop centred on the logo. AVIF, then WebP, then JPEG.
 */
export function BannerImage({ priority = false }: { priority?: boolean }) {
  return (
    <picture className="banner-image">
      <source
        media={PHONE_MEDIA}
        type="image/avif"
        srcSet={set('banner-mobile', PHONE, 'avif')}
        sizes="100vw"
      />
      <source
        media={PHONE_MEDIA}
        type="image/webp"
        srcSet={set('banner-mobile', PHONE, 'webp')}
        sizes="100vw"
      />
      <source type="image/avif" srcSet={set('banner', WIDE, 'avif')} sizes={WIDE_SIZES} />
      <source type="image/webp" srcSet={set('banner', WIDE, 'webp')} sizes={WIDE_SIZES} />
      <img
        src={`${base}banner/banner-1280.jpg`}
        alt="B24DUL Live"
        width={2172}
        height={724}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </picture>
  );
}
