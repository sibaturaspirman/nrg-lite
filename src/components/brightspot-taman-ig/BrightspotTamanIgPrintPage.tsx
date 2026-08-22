"use client";

import { BtIgImage as Image } from "@/components/brightspot-taman-ig/BtIgImage";
import { useCallback, useEffect, useRef, useState } from "react";
import { btigPush, btigReplace } from "@/components/brightspot-taman-ig/btigNav";
import { printImage } from "@/components/brightspot-taman-ig/btigPrint";
import { getBrightspotTamanIgPrint } from "@/components/brightspot-taman-ig/brightspotTamanIgSession";

export function BrightspotTamanIgPrintPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "printing" | "done" | "error">(
    "loading",
  );
  const started = useRef(false);
  const navigated = useRef(false);
  const printing = useRef(false);
  const dualRef = useRef<string | null>(null);

  const goResult = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    btigPush("/brightspot-taman-ig/result");
  }, []);

  const runPrint = useCallback(async () => {
    const dual = dualRef.current;
    if (!dual || printing.current) return;
    printing.current = true;
    setStatus("printing");
    try {
      await printImage(dual);
      setStatus("done");
      goResult();
    } catch {
      setStatus("error");
    } finally {
      printing.current = false;
    }
  }, [goResult]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const dual = getBrightspotTamanIgPrint();
    if (!dual) {
      btigReplace("/brightspot-taman-ig/template");
      return;
    }

    dualRef.current = dual;
    setPreview(dual);

    // Auto-print as soon as the print screen is shown.
    // (Template "Next" already did heavy work; this call is the dialog trigger.)
    void runPrint();
  }, [runPrint]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (status === "error") {
          void runPrint();
          return;
        }
        goResult();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goResult, runPrint, status]);

  const onTap = () => {
    // Retry with a fresh user gesture if auto-print was blocked (common in PWA offline)
    if (status === "error" || status === "loading") {
      void runPrint();
      return;
    }
    if (status === "printing") {
      void runPrint();
      return;
    }
    goResult();
  };

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
          onClick={onTap}
          className="absolute inset-[2.8cqw] z-10 flex flex-col items-center justify-center gap-[4cqw] px-[4cqw] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {preview ? (
            <div
              className="w-[88%] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              style={{ aspectRatio: "1600 / 1066" }}
            >
              <Image
                src={preview}
                alt="Preview print 4R"
                width={1600}
                height={1066}
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
              ? "Print gagal — tap untuk coba lagi"
              : status === "printing"
                ? "Printing… (tap untuk print ulang)"
                : status === "done"
                  ? "Selesai"
                  : "Menyiapkan…"}
          </p>
        </button>
      </div>
    </div>
  );
}
