"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  BRIGHTSPOT_TAMAN_PHOTO_URL_KEY,
} from "@/components/brightspot-taman/BrightspotTamanPhotobooth";
import { btPush, btReplace } from "@/components/brightspot-taman/btNav";
import { getBrightspotTamanPhoto } from "@/components/brightspot-taman/brightspotTamanSession";
import { uploadPhoto } from "@/lib/uploadPhoto";

/** Matches strip template aspect (1182 / 3544). */
const STRIP_ASPECT = "1182 / 3544";

type UploadStatus = "idle" | "uploading" | "done" | "error";

async function makeQr(target: string) {
  return QRCode.toDataURL(target, {
    width: 512,
    margin: 1,
    color: { dark: "#0a0a3a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function BrightspotTamanResultPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const goPoint = useCallback(() => {
    btPush("/brightspot-taman/point");
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
          sessionStorage.setItem(BRIGHTSPOT_TAMAN_PHOTO_URL_KEY, res.file);
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
      cachedUploadUrl = sessionStorage.getItem(BRIGHTSPOT_TAMAN_PHOTO_URL_KEY);
    } catch {
      cachedUploadUrl = null;
    }
    const dataUrl = getBrightspotTamanPhoto();
    if (!dataUrl) {
      btReplace("/brightspot-taman");
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

          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[2cqw] ">
            {photo && (
              <div
                className="relative h-[min(48cqh,100%)] max-h-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                style={{ aspectRatio: STRIP_ASPECT, width: "auto" }}
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
              <div className="flex aspect-square w-[42%] shrink-0 items-center justify-center bg-white p-[2cqw] shadow-xl">
                {status === "uploading" && (
                  <div className="flex flex-col items-center gap-2 text-[#0a0a3a]">
                    <span
                      aria-hidden
                      className="block h-8 w-8 animate-spin rounded-full border-4 border-[#0a0a3a]/20 border-t-[#0a0a3a]"
                    />
                    <span className="text-[clamp(0.6rem,2.4cqw,0.9rem)] font-semibold">
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
                    <span className="text-[clamp(0.65rem,2.6cqw,0.95rem)] font-semibold">
                      {errorMsg ?? "Upload gagal"}
                    </span>
                    <span className="text-[clamp(0.55rem,2.2cqw,0.8rem)] underline">
                      Coba lagi
                    </span>
                  </button>
                )}
                {status === "done" && qrUrl && (
                  <Image
                    src={qrUrl}
                    alt="QR code untuk mengunduh"
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
