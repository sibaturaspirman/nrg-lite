"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  WEDDING_PHOTO_URL_KEY,
  getWeddingPhoto,
} from "@/components/wedding/weddingSession";
import { uploadPhoto } from "@/lib/uploadPhoto";

type UploadStatus = "idle" | "uploading" | "done" | "error";

async function makeQr(target: string) {
  return QRCode.toDataURL(target, {
    width: 512,
    margin: 1,
    color: { dark: "#0a0a3a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function WeddingResultPage() {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runUpload = useCallback(
    async (dataUrl: string, signal?: AbortSignal) => {
      setStatus("uploading");
      setErrorMsg(null);
      try {
        const res = await uploadPhoto({
          dataUrl,
          signal,
          fileName: `wedding-${Date.now()}.png`,
        });
        try {
          sessionStorage.setItem(WEDDING_PHOTO_URL_KEY, res.file);
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
      cachedUploadUrl = sessionStorage.getItem(WEDDING_PHOTO_URL_KEY);
    } catch {
      cachedUploadUrl = null;
    }

    const dataUrl = getWeddingPhoto();
    if (!dataUrl) {
      router.replace("/wedding");
      return;
    }
    setPhoto(dataUrl);

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
  }, [router, runUpload]);

  const retry = () => {
    if (!photo) return;
    void runUpload(photo);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        router.push("/wedding");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <Link
      href="/wedding"
      aria-label="Kembali ke beranda"
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] [container-type:inline-size]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <Image
          src="/images/wedding/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-[6cqw] py-[6cqw]">
          {photo && (
            <div className="mb-[4cqw] w-[42%] overflow-hidden rounded-xl border-2 border-white/90 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <Image
                src={photo}
                alt="Hasil foto"
                width={1200}
                height={1784}
                unoptimized
                priority
                className="h-auto w-full"
              />
            </div>
          )}

          <div className="flex aspect-square w-[48%] items-center justify-center rounded-xl bg-white p-[2cqw] shadow-xl">
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  retry();
                }}
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

          <p className="mt-[3cqw] text-[2vw] font-semibold uppercase tracking-[0.2em] text-[#fff]">
            TAP ANYWHERE TO CLOSE
          </p>
        </div>
      </div>
    </Link>
  );
}
