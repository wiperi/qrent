type Props = { alt: string; sizes: string; className?: string; priority?: boolean };

// Pre-encoded from our original photograph. No request-time image transformation.
export default function HarbourImage({ alt, sizes, className, priority = false }: Props) {
  const srcSet = (format: string) =>
    [640, 960, 1440, 1920]
      .map(width => `/media/sydney-harbour-v1-${width}.${format} ${width}w`)
      .join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <img
        src="/media/sydney-harbour-v1-960.webp"
        srcSet={srcSet('webp')}
        sizes={sizes}
        alt={alt}
        width={4021}
        height={2491}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
      />
    </picture>
  );
}
