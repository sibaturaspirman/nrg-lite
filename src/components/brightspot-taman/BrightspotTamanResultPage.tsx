"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  BRIGHTSPOT_TAMAN_PHOTO_KEY,
  BRIGHTSPOT_TAMAN_PHOTO_URL_KEY,
} from "@/components/brightspot-taman/BrightspotTamanPhotobooth";
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

export function BrightspotTamanResultPage() {
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
    let dataUrl: string | null = null;
    let cachedUploadUrl: string | null = null;
    try {
      dataUrl = sessionStorage.getItem(BRIGHTSPOT_TAMAN_PHOTO_KEY);
      cachedUploadUrl = sessionStorage.getItem(BRIGHTSPOT_TAMAN_PHOTO_URL_KEY);
    } catch {
      dataUrl = null;
    }
    if (!dataUrl) {
      router.replace("/brightspot-taman");
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
        router.push("/brightspot-taman");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <Link
      href="/brightspot-taman"
      aria-label="Kembali ke beranda"
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
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

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-[6cqw] py-[6cqw]">
          <Image
            src="/images/Z-SCAN2.png"
            alt="Scan QR to download"
            width={1000}
            height={180}
            priority
            className="mb-[3cqw] h-auto w-[70vw] object-contain"
          />

          {photo && (
            <div className="w-[30vw] overflow-hidden rounded-xl border-2 border-white shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <Image
                src={photo}
                alt="Hasil foto"
                width={1080}
                height={1920}
                unoptimized
                priority
                className="h-auto w-full"
              />
            </div>
          )}

          <div className="mt-[4cqw] flex aspect-square w-[60vw] items-center justify-center rounded-xl bg-white p-[2cqw] shadow-xl">
            {status === "uploading" && (
              <div className="flex flex-col items-center gap-2 text-[#0a0a3a]">
                <span
                  aria-hidden
                  className="block h-8 w-8 animate-spin rounded-full border-4 border-[#0a0a3a]/20 border-t-[#0a0a3a]"
                />
                <span className="text-[clamp(0.6rem,2.4cqw,0.9rem)] text-2xl font-semibold">
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
