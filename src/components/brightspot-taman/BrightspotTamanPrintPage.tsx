"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BRIGHTSPOT_TAMAN_PHOTO_KEY,
  BRIGHTSPOT_TAMAN_PRINT_KEY,
} from "@/components/brightspot-taman/BrightspotTamanPhotobooth";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** Side-by-side duplicate for 4R (dibagi 2 kiri–kanan). */
async function buildDualStrip(stripSrc: string): Promise<string> {
  const strip = await loadImage(stripSrc);
  const w = strip.naturalWidth;
  const h = strip.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  // 1:1 pixel copy — no resampling blur
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(strip, 0, 0, w, h);
  ctx.drawImage(strip, w, 0, w, h);
  return canvas.toDataURL("image/jpeg", 1);
}

function printImage(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try {
        iframe.remove();
      } catch {
        // ignore
      }
      resolve();
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      const onDone = () => {
        win.removeEventListener("afterprint", onDone);
        setTimeout(cleanup, 200);
      };
      win.addEventListener("afterprint", onDone);
      setTimeout(cleanup, 60000);
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
      }
    };

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print 4R</title>
    <style>
      @page { size: 4in 6in; margin: 0; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: fill;
      }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="" />
  </body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    iframe.src = URL.createObjectURL(blob);
    document.body.appendChild(iframe);
  });
}

export function BrightspotTamanPrintPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "printing" | "done" | "error">(
    "loading",
  );
  const started = useRef(false);

  const goResult = useCallback(() => {
    router.push("/brightspot-taman/result");
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let strip: string | null = null;
    let cachedDual: string | null = null;
    try {
      strip = sessionStorage.getItem(BRIGHTSPOT_TAMAN_PHOTO_KEY);
      cachedDual = sessionStorage.getItem(BRIGHTSPOT_TAMAN_PRINT_KEY);
    } catch {
      strip = null;
    }
    if (!strip && !cachedDual) {
      router.replace("/brightspot-taman/template");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Prefer dual built from the confirmed template strip
        const dual =
          cachedDual ??
          (strip ? await buildDualStrip(strip) : null);
        if (!dual) throw new Error("Print data missing");
        if (cancelled) return;
        setPreview(dual);
        if (!cachedDual) {
          try {
            sessionStorage.setItem(BRIGHTSPOT_TAMAN_PRINT_KEY, dual);
          } catch {
            // quota — still print from memory
          }
        }
        setStatus("printing");
        await printImage(dual);
        if (cancelled) return;
        setStatus("done");
        goResult();
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, goResult]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goResult();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goResult]);

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

        <button
          type="button"
          onClick={goResult}
          className="absolute inset-[2.8cqw] z-10 flex flex-col items-center justify-center gap-[4cqw] px-[4cqw] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {preview ? (
            <div
              className="w-[88%] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              style={{ aspectRatio: "2 / 3" }}
            >
              <Image
                src={preview}
                alt="Preview print 4R"
                width={2364}
                height={3544}
                unoptimized
                priority
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="text-[clamp(0.85rem,3.5cqw,1.2rem)] text-white/80">
              Menyiapkan print…
            </div>
          )}

          <p className="text-center text-[clamp(0.75rem,3.2cqw,1.1rem)] font-semibold uppercase tracking-[0.14em] text-white">
            {status === "error"
              ? "Print gagal — tap untuk lanjut"
              : status === "printing"
                ? "Printing…"
                : status === "done"
                  ? "Selesai"
                  : "Menyiapkan…"}
          </p>
        </button>
      </div>
    </div>
  );
}
