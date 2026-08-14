"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseCamera2Options = {
  facingMode?: "user" | "environment";
  /** Preferred capture size. Browser will fall back if unsupported. */
  width?: number;
  height?: number;
};

/** Highest → lowest; getUserMedia tries each until one succeeds. */
const RESOLUTION_LADDER = [
  { width: 3840, height: 2160 }, // 4K UHD
  { width: 2560, height: 1440 }, // 2K / QHD
  { width: 1920, height: 1080 }, // 1080p
  { width: 1280, height: 720 }, // 720p fallback
] as const;

async function getUserMediaWithFallback(
  facingMode: "user" | "environment",
  preferred?: { width: number; height: number },
): Promise<MediaStream> {
  const ladder = preferred
    ? [
        preferred,
        ...RESOLUTION_LADDER.filter(
          (r) =>
            !(r.width === preferred.width && r.height === preferred.height),
        ),
      ]
    : [...RESOLUTION_LADDER];

  let lastError: unknown;

  for (const res of ladder) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: res.width },
          height: { ideal: res.height },
        },
        audio: false,
      });
    } catch (e) {
      lastError = e;
    }

    // Also try swapped (portrait) ideal for devices that expose portrait modes
    if (res.width !== res.height) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: res.height },
            height: { ideal: res.width },
          },
          audio: false,
        });
      } catch (e) {
        lastError = e;
      }
    }
  }

  // Last resort: any camera at any resolution
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });
  } catch (e) {
    throw lastError ?? e;
  }
}

export function useCamera2(options: UseCamera2Options = {}) {
  const { facingMode = "user", width, height } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    stop();
    try {
      const preferred =
        width && height ? { width, height } : undefined;
      const stream = await getUserMediaWithFallback(facingMode, preferred);
      streamRef.current = stream;
      const el = videoRef.current;
      if (el) {
        el.srcObject = stream;
        try {
          await el.play();
        } catch (playErr) {
          // Benign: play() interrupted by a new load/srcObject change.
          const aborted =
            (playErr instanceof DOMException &&
              playErr.name === "AbortError") ||
            (playErr instanceof Error &&
              /play\(\) request was interrupted/i.test(playErr.message));
          if (!aborted) throw playErr;
        }
        setReady(true);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Tidak bisa mengakses kamera.";
      setError(message);
      setReady(false);
    }
  }, [facingMode, width, height, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, start, stop, error, ready };
}
