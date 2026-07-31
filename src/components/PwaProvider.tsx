"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      // Keep SW on in dev too — Brightspot Taman must work offline end-to-end
      disable={false}
      cacheOnNavigation
      reloadOnOnline={false}
      options={{
        // Serwist turbopack bundles SW as ESM — must be module
        type: "module",
        scope: "/",
      }}
    >
      {children}
    </SerwistProvider>
  );
}
