"use client";

import { useEffect } from "react";
import { bengkelReplace } from "@/components/bengkel/bengkelNav";

/** Legacy route — bengkel no longer has a template picker. */
export function BengkelTemplatePage() {
  useEffect(() => {
    bengkelReplace("/bengkel/booth");
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black text-white/70">
      Mengalihkan…
    </div>
  );
}
