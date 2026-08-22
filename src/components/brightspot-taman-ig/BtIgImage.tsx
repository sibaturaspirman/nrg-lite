"use client";

import {
  resolveBtigAsset,
  subscribeBtigAssets,
  warmBtigAssets,
} from "@/components/brightspot-taman-ig/btigAssetCache";
import { useEffect, useState, type ImgHTMLAttributes } from "react";

type BtIgImageProps = Omit<
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
export function BtIgImage({
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
}: BtIgImageProps) {
  const [resolved, setResolved] = useState(() => resolveBtigAsset(src));

  useEffect(() => {
    void warmBtigAssets();
    setResolved(resolveBtigAsset(src));
    return subscribeBtigAssets(() => setResolved(resolveBtigAsset(src)));
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
