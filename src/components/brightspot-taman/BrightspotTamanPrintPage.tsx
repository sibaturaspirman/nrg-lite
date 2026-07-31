"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { btPush, btReplace } from "@/components/brightspot-taman/btNav";
import { getBrightspotTamanPrint } from "@/components/brightspot-taman/brightspotTamanSession";

function printImage(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try {
        URL.revokeObjectURL(iframe.src);
      } catch {
        // ignore
      }
      try {
        iframe.remove();
      } catch {
        // ignore
      }
      resolve();
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!win || !doc) {
        cleanup();
        return;
      }

      const img = doc.createElement("img");
      img.alt = "";
      img.style.display = "block";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "fill";

      const onAfterPrint = () => {
        win.removeEventListener("afterprint", onAfterPrint);
        cleanup();
      };
      win.addEventListener("afterprint", onAfterPrint);

      img.onload = () => {
        try {
          win.focus();
          // In Chromium, print() blocks until the dialog is closed.
          win.print();
        } catch {
          // ignore
        }
        // Fallback if afterprint never fires (some WebViews / kiosk browsers)
        setTimeout(cleanup, 300);
      };
      img.onerror = () => cleanup();
      doc.body.appendChild(img);
      img.src = dataUrl;
    };

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print 4R</title>
    <style>
      @page { size: 4in 6in; margin: 0; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body></body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    iframe.src = URL.createObjectURL(blob);
    document.body.appendChild(iframe);
  });
}

export function BrightspotTamanPrintPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "printing" | "done" | "error">(
    "loading",
  );
  const started = useRef(false);
  const navigated = useRef(false);

  const goResult = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    btPush("/brightspot-taman/result");
  }, []);

  useEffect(() => {
    // Run once — do NOT cancel navigation on Strict Mode remount cleanup
    if (started.current) return;
    started.current = true;

    const dual = getBrightspotTamanPrint();
    if (!dual) {
      btReplace("/brightspot-taman/template");
      return;
    }

    setPreview(dual);
    setStatus("printing");

    void (async () => {
      try {
        await printImage(dual);
        setStatus("done");
        goResult();
      } catch {
        setStatus("error");
      }
    })();
  }, [goResult]);

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
