"use client";

interface FallbackImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function FallbackImage({ src, fallbackSrc, alt, className, style }: FallbackImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => { (e.target as HTMLImageElement).src = fallbackSrc; }}
    />
  );
}
