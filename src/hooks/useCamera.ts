"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseCameraOptions = {
  facingMode?: "user" | "environment";
};

export function useCamera(options: UseCameraOptions = {}) {
  const { facingMode = "user" } = options;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      const el = videoRef.current;
      if (el) {
        el.srcObject = stream;
        await el.play();
        setReady(true);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Tidak bisa mengakses kamera.";
      setError(message);
      setReady(false);
    }
  }, [facingMode, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, start, stop, error, ready };
}
