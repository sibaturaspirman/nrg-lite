"use client";

import {
  resolveButikAsset,
  subscribeButikAssets,
  warmButikAssets,
} from "@/components/butik/butikAssetCache";
import { useEffect, useState, type ImgHTMLAttributes } from "react";

type ButikImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height" | "alt"
> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Accepted for API parity with next/image — ignored (always eager for offline). */
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
};

/**
 * Plain <img> + in-memory blob cache.
 * Avoids `/_next/image` and keeps assets available after SPA remounts offline.
 */
export function ButikImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  style,
  priority,
  sizes: _sizes,
  unoptimized: _unoptimized,
  ...rest
}: ButikImageProps) {
  const [resolved, setResolved] = useState(() => resolveButikAsset(src));

  useEffect(() => {
    void warmButikAssets();
    setResolved(resolveButikAsset(src));
    return subscribeButikAssets(() => setResolved(resolveButikAsset(src)));
  }, [src]);

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        className={className}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          ...style,
        }}
        {...rest}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      style={style}
      {...rest}
    />
  );
}
