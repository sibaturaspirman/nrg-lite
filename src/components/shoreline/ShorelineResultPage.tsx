"use client";

import { ShorelineImage as Image } from "@/components/shoreline/ShorelineImage";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { SHORELINE_PHOTO_URL_KEY } from "@/components/shoreline/ShorelinePhotobooth";
import {
  shorelinePush,
  shorelineReplace,
} from "@/components/shoreline/shorelineNav";
import { getShorelineShots } from "@/components/shoreline/shorelineSession";
import { CAPTURE_H, CAPTURE_W } from "@/components/shoreline/shorelineStrip";
import { uploadPhoto } from "@/lib/uploadPhoto";

type UploadStatus = "idle" | "uploading" | "done" | "error";

const SESSION_COUNTER_KEY = "shorelineZynSessionCounter";
const SESSION_CURRENT_KEY = "shorelineZynSessionCurrent";

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

export function ShorelineResultPage() {
  const [shots, setShots] = useState<string[] | null>(null);
  const [qrUrls, setQrUrls] = useState<(string | null)[]>([null, null]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const goPoint = useCallback(() => {
    shorelinePush("/shoreline/point");
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
    async (framedShots: string[], signal?: AbortSignal) => {
      if (!navigator.onLine) {
        setStatus("idle");
        setQrUrls([null, null]);
        return;
      }
      if (!framedShots[0] || !framedShots[1]) {
        setErrorMsg("Foto capture 1 & 2 harus tersedia.");
        setStatus("error");
        return;
      }
      setStatus("uploading");
      setErrorMsg(null);
      try {
        const session = getZynSessionNumber();
        const results = await Promise.all(
          framedShots.slice(0, 2).map((dataUrl, i) => {
            const n = i + 1;
            return uploadPhoto({
              dataUrl,
              name: `ZYN Sesi ${session}`,
              phone: `${n}`,
              fileName: `zyn-sesi-${session}-capture-${n}.jpg`,
              signal,
            });
          }),
        );
        const fileUrls = results.map((r) => r.file);
        try {
          sessionStorage.setItem(
            SHORELINE_PHOTO_URL_KEY,
            JSON.stringify(fileUrls),
          );
        } catch {
          // ignore
        }
        const qrs = await Promise.all(fileUrls.map((url) => makeQr(url)));
        setQrUrls(qrs);
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
    let cached: string[] | null = null;
    try {
      const raw = sessionStorage.getItem(SHORELINE_PHOTO_URL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed.length >= 2 &&
          parsed.every((x) => typeof x === "string" && x.length > 0)
        ) {
          cached = [parsed[0], parsed[1]];
        } else if (typeof raw === "string" && raw.startsWith("http")) {
          // legacy single URL
          cached = null;
        }
      }
    } catch {
      cached = null;
    }
    const data = getShorelineShots();
    if (!data) {
      shorelineReplace("/shoreline");
      return;
    }
    setShots(data);

    if (!navigator.onLine) {
      setStatus("idle");
      setQrUrls([null, null]);
      return;
    }

    const controller = new AbortController();

    if (cached) {
      setStatus("done");
      Promise.all(cached.map((url) => makeQr(url)))
        .then(setQrUrls)
        .catch(() => setQrUrls([null, null]));
      return () => controller.abort();
    }

    void runUpload(data, controller.signal);

    return () => controller.abort();
  }, [runUpload, online]);

  const retry = () => {
    if (!shots) return;
    void runUpload(shots);
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
            {shots && (
              <div className="grid w-[88%] grid-cols-2 gap-[2.5cqw]">
                {shots.map((shot, i) => (
                  <div
                    key={i}
                    className="relative w-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                    style={{ aspectRatio: `${CAPTURE_W} / ${CAPTURE_H}` }}
                  >
                    <Image
                      src={shot}
                      alt={`Hasil foto ${i + 1}`}
                      fill
                      unoptimized
                      priority
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {online && (
              <div className="grid w-[88%] grid-cols-2 gap-[2.5cqw]">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="flex aspect-square w-full items-center justify-center bg-white p-[2cqw] shadow-xl"
                  >
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
                    {status === "error" && i === 0 && (
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
                    {status === "done" && qrUrls[i] && (
                      <Image
                        src={qrUrls[i]!}
                        alt={`QR code capture ${i + 1}`}
                        width={512}
                        height={512}
                        unoptimized
                        className="h-full w-full"
                      />
                    )}
                  </div>
                ))}
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
