"use client";

import { ButikImage as Image } from "@/components/butik/ButikImage";
import { useCallback, useEffect, useRef, useState } from "react";
import { butikPush, butikReplace } from "@/components/butik/butikNav";
import { printImage } from "@/components/butik/butikPrint";
import { getButikPrint } from "@/components/butik/butikSession";
import { STRIP_ASPECT, STRIP_H, STRIP_W } from "@/components/butik/butikStrip";

export function ButikPrintPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "printing" | "done" | "error">(
    "loading",
  );
  const started = useRef(false);
  const navigated = useRef(false);
  const printing = useRef(false);
  const printRef = useRef<string | null>(null);

  const goResult = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    butikPush("/butik/result");
  }, []);

  const runPrint = useCallback(async () => {
    const data = printRef.current;
    if (!data || printing.current) return;
    printing.current = true;
    setStatus("printing");
    try {
      await printImage(data);
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

    const data = getButikPrint();
    if (!data) {
      butikReplace("/butik/booth");
      return;
    }

    printRef.current = data;
    setPreview(data);
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
              className="max-h-[70%] w-[72%] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              style={{ aspectRatio: STRIP_ASPECT }}
            >
              <Image
                src={preview}
                alt="Preview print A5"
                width={STRIP_W}
                height={STRIP_H}
                unoptimized
                priority
                className="h-full w-full object-contain"
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
                ? "Printing A5… (tap untuk print ulang)"
                : status === "done"
                  ? "Selesai"
                  : "Menyiapkan…"}
          </p>
        </button>
      </div>
    </div>
  );
}
