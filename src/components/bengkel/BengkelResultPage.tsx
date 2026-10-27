"use client";

import { BengkelImage as Image } from "@/components/bengkel/BengkelImage";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { BENGKEL_PHOTO_URL_KEY } from "@/components/bengkel/BengkelPhotobooth";
import {
  bengkelPush,
  bengkelReplace,
} from "@/components/bengkel/bengkelNav";
import { getBengkelShots } from "@/components/bengkel/bengkelSession";
import { FRAME_ASPECT } from "@/components/bengkel/bengkelStrip";
import { uploadPhoto } from "@/lib/uploadPhoto";

type UploadStatus = "idle" | "uploading" | "done" | "error";

const SESSION_COUNTER_KEY = "bengkelZynSessionCounter";
const SESSION_CURRENT_KEY = "bengkelZynSessionCurrent";

/** Persistent counter in localStorage; reused for retries of the same result. */
function getZynSessionNumber(): number {
  try {
    const existing = sessionStorage.getItem(SESSION_CURRENT_KEY);
    if (existing) {
      const n = Number.parseInt(existing, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // ignore
  }

  let next = 1;
  try {
    const raw = localStorage.getItem(SESSION_COUNTER_KEY);
    const current = raw ? Number.parseInt(raw, 10) : 0;
    next = Number.isFinite(current) && current > 0 ? current + 1 : 1;
    localStorage.setItem(SESSION_COUNTER_KEY, String(next));
  } catch {
    // ignore
  }

  try {
    sessionStorage.setItem(SESSION_CURRENT_KEY, String(next));
  } catch {
    // ignore
  }
  return next;
}

async function makeQr(target: string) {
  return QRCode.toDataURL(target, {
    width: 512,
    margin: 1,
    color: { dark: "#0a0a3a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function BengkelResultPage() {
  const [shots, setShots] = useState<string[] | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const goPoint = useCallback(() => {
    bengkelPush("/bengkel/point");
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const runUpload = useCallback(
    async (dataUrl: string, signal?: AbortSignal) => {
      if (!navigator.onLine) {
        setStatus("idle");
        setQrUrl(null);
        return;
      }
      if (!dataUrl) {
        setErrorMsg("Foto tidak tersedia.");
        setStatus("error");
        return;
      }
      setStatus("uploading");
      setErrorMsg(null);
      try {
        const session = getZynSessionNumber();
        const res = await uploadPhoto({
          dataUrl,
          name: `ZYN Sesi ${session}`,
          phone: "1",
          fileName: `zyn-sesi-${session}-capture-1.jpg`,
          signal,
        });
        try {
          sessionStorage.setItem(BENGKEL_PHOTO_URL_KEY, res.file);
        } catch {
          // ignore
        }
        const qr = await makeQr(res.file);
        setQrUrl(qr);
        setStatus("done");
      } catch (err: unknown) {
        if (signal?.aborted) return;
        const message =
          err instanceof Error ? err.message : "Tidak bisa upload foto.";
        setErrorMsg(message);
        setStatus("error");
      }
    },
    [],
  );

  useEffect(() => {
    let cachedUrl: string | null = null;
    try {
      const raw = sessionStorage.getItem(BENGKEL_PHOTO_URL_KEY);
      if (raw) {
        if (raw.startsWith("http")) {
          cachedUrl = raw;
        } else {
          const parsed = JSON.parse(raw) as unknown;
          if (typeof parsed === "string" && parsed.startsWith("http")) {
            cachedUrl = parsed;
          } else if (
            Array.isArray(parsed) &&
            typeof parsed[0] === "string" &&
            parsed[0].startsWith("http")
          ) {
            cachedUrl = parsed[0];
          }
        }
      }
    } catch {
      cachedUrl = null;
    }
    const data = getBengkelShots();
    if (!data?.[0]) {
      bengkelReplace("/bengkel");
      return;
    }
    setShots(data);

    if (!navigator.onLine) {
      setStatus("idle");
      setQrUrl(null);
      return;
    }

    const controller = new AbortController();

    if (cachedUrl) {
      setStatus("done");
      makeQr(cachedUrl)
        .then(setQrUrl)
        .catch(() => setQrUrl(null));
      return () => controller.abort();
    }

    void runUpload(data[0], controller.signal);

    return () => controller.abort();
  }, [runUpload, online]);

  const retry = () => {
    if (!shots?.[0]) return;
    void runUpload(shots[0]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goPoint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPoint]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black">
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] [container-type:inline-size]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <Image
          src="/images/shoreline/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <div className="absolute inset-[3.8cqw] z-10 flex flex-col items-center justify-between px-[2cqw] py-[8cqw]">
          <Image
            src="/images/shoreline/discover.png"
            alt="Discover your result — your captured moment is ready to be unlocked."
            width={900}
            height={200}
            priority
            className="h-auto w-[78%] shrink-0 object-contain"
          />

          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[3cqw]">
            {shots?.[0] && (
              <div
                className="relative w-[48%] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                style={{ aspectRatio: FRAME_ASPECT }}
              >
                <Image
                  src={shots[0]}
                  alt="Hasil foto"
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                />
              </div>
            )}

            {online && (
              <div className="flex aspect-square w-[48%] items-center justify-center bg-white p-[2cqw] shadow-xl">
                {status === "uploading" && (
                  <div className="flex flex-col items-center gap-2 text-[#0a0a3a]">
                    <span
                      aria-hidden
                      className="block h-7 w-7 animate-spin rounded-full border-4 border-[#0a0a3a]/20 border-t-[#0a0a3a]"
                    />
                    <span className="text-[clamp(0.55rem,2.2cqw,0.8rem)] font-semibold">
                      Uploading...
                    </span>
                  </div>
                )}
                {status === "error" && (
                  <button
                    type="button"
                    onClick={retry}
                    className="flex flex-col items-center gap-1 text-center text-[#0a0a3a]"
                  >
                    <span className="text-[clamp(0.6rem,2.4cqw,0.85rem)] font-semibold">
                      {errorMsg ?? "Upload gagal"}
                    </span>
                    <span className="text-[clamp(0.5rem,2cqw,0.75rem)] underline">
                      Coba lagi
                    </span>
                  </button>
                )}
                {status === "done" && qrUrl && (
                  <Image
                    src={qrUrl}
                    alt="QR code download"
                    width={512}
                    height={512}
                    unoptimized
                    className="h-full w-full"
                  />
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={goPoint}
            aria-label="Lanjut"
            className="w-[60%] shrink-0 outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Image
              src="/images/shoreline/scan.png"
              alt="Next"
              width={1094}
              height={240}
              priority
              className="h-auto w-full object-contain"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

