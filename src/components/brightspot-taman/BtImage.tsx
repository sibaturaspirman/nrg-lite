"use client";

import Image, { type ImageProps } from "next/image";

/**
 * next/image optimizer hits `/_next/image?...` which is NOT in the SW precache.
 * Serve public paths as-is so offline can use `/images/bt/*` from Cache Storage.
 */
export function BtImage(props: ImageProps) {
  return <Image {...props} unoptimized />;
}
