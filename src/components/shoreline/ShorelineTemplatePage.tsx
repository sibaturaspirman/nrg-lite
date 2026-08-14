"use client";

import { useEffect } from "react";
import { shorelineReplace } from "@/components/shoreline/shorelineNav";

/** Legacy route — shoreline no longer has a template picker. */
export function ShorelineTemplatePage() {
  useEffect(() => {
    shorelineReplace("/shoreline/booth");
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black text-white/70">
      Mengalihkan…
    </div>
  );
}
