"use client";

import { useEffect } from "react";
import { butikReplace } from "@/components/butik/butikNav";

/** Legacy route — butik no longer has a template picker. */
export function ButikTemplatePage() {
  useEffect(() => {
    butikReplace("/butik/booth");
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black text-white/70">
      Mengalihkan…
    </div>
  );
}
