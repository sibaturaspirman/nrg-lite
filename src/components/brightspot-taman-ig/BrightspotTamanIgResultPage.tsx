"use client";

import { BtIgImage as Image } from "@/components/brightspot-taman-ig/BtIgImage";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { BRIGHTSPOT_TAMAN_IG_PHOTO_URL_KEY } from "@/components/brightspot-taman-ig/BrightspotTamanIgPhotobooth";
import { btigPush, btigReplace } from "@/components/brightspot-taman-ig/btigNav";
import { getBrightspotTamanIgPhoto } from "@/components/brightspot-taman-ig/brightspotTamanIgSession";
import { uploadPhoto } from "@/lib/uploadPhoto";

/** Matches IG template aspect (800 / 1066). */
const STRIP_ASPECT = "800 / 1066";

type UploadStatus = "idle" | "uploading" | "done" | "error";

async function makeQr(target: string) {
  return QRCode.toDataURL(target, {
    width: 512,
    margin: 1,
    color: { dark: "#0a0a3a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function BrightspotTamanIgResultPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const goPoint = useCallback(() => {
    btigPush("/brightspot-taman-ig/point");
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
      setStatus("uploading");
      setErrorMsg(null);
      try {
        const res = await uploadPhoto({ dataUrl, signal });
        try {
          sessionStorage.setItem(BRIGHTSPOT_TAMAN_IG_PHOTO_URL_KEY, res.file);
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
    let cachedUploadUrl: string | null = null;
    try {
      cachedUploadUrl = sessionStorage.getItem(BRIGHTSPOT_TAMAN_IG_PHOTO_URL_KEY);
    } catch {
      cachedUploadUrl = null;
    }
    const dataUrl = getBrightspotTamanIgPhoto();
    if (!dataUrl) {
      btigReplace("/brightspot-taman-ig");
      return;
    }
    setPhoto(dataUrl);

    if (!navigator.onLine) {
      setStatus("idle");
      setQrUrl(null);
      return;
    }

    const controller = new AbortController();

    if (cachedUploadUrl) {
      setStatus("done");
      makeQr(cachedUploadUrl)
        .then(setQrUrl)
        .catch(() => setQrUrl(null));
      return () => controller.abort();
    }

    void runUpload(dataUrl, controller.signal);

    return () => controller.abort();
  }, [runUpload, online]);

  const retry = () => {
    if (!photo) return;
    void runUpload(photo);
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
          src="/images/bt/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <div className="absolute inset-[3.8cqw] z-10 flex flex-col items-center justify-between px-[2cqw] py-[8cqw]">
          <Image
            src="/images/bt/discover.png"
            alt="Discover your result — your captured moment is ready to be unlocked."
            width={900}
            height={200}
            priority
            className="h-auto w-[68%] shrink-0 object-contain"
          />

          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[3cqw]">
            {photo && (
              <div
                className="relative w-[55%] max-h-[58%] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                style={{ aspectRatio: STRIP_ASPECT }}
              >
                <Image
                  src={photo}
                  alt="Hasil foto"
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                />
              </div>
            )}

            {online && (
              <div className="flex aspect-square w-[28%] items-center justify-center bg-white p-[2cqw] shadow-xl">
                {status === "uploading" && (
                  <span
                    aria-hidden
                    className="block h-8 w-8 animate-spin rounded-full border-4 border-[#0a0a3a]/20 border-t-[#0a0a3a]"
                  />
                )}
                {status === "error" && (
                  <button
                    type="button"
                    onClick={retry}
                    className="text-center text-[clamp(0.65rem,2.8cqw,0.9rem)] font-semibold text-[#0a0a3a] underline"
                  >
                    {errorMsg ?? "Coba lagi"}
                  </button>
                )}
                {status === "done" && qrUrl && (
                  <Image
                    src={qrUrl}
                    alt="QR download foto"
                    width={256}
                    height={256}
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
              src="/images/bt/btn-next.png"
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
