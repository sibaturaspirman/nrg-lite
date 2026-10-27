"use client";

import { useEffect, useState } from "react";
import { BengkelHomeLanding } from "@/components/bengkel/BengkelHomeLanding";
import { BengkelPhotobooth } from "@/components/bengkel/BengkelPhotobooth";
import { BengkelPointPage } from "@/components/bengkel/BengkelPointPage";
import { BengkelReadyPage } from "@/components/bengkel/BengkelReadyPage";
import { BengkelResultPage } from "@/components/bengkel/BengkelResultPage";
import { BengkelTncPage } from "@/components/bengkel/BengkelTncPage";
import { warmBengkelAssets } from "@/components/bengkel/bengkelAssetCache";
import { persistBengkelDocuments } from "@/components/bengkel/bengkelDocumentCache";
import {
  getBengkelPath,
  subscribeBengkelPath,
  warmBengkelRouteCache,
} from "@/components/bengkel/bengkelNav";

/**
 * Client shell: all Bengkel screens in one bundle.
 * In-app navigation uses History API → works fully offline after first load.
 */
export function BengkelApp() {
  const [path, setPath] = useState("/bengkel");

  useEffect(() => {
    setPath(getBengkelPath());
    warmBengkelRouteCache();
    void warmBengkelAssets();
    void persistBengkelDocuments();
    return subscribeBengkelPath(setPath);
  }, []);

  switch (path) {
    case "/bengkel/tnc":
      return <BengkelTncPage />;
    case "/bengkel/ready":
      return <BengkelReadyPage />;
    case "/bengkel/booth":
      return <BengkelPhotobooth />;
    case "/bengkel/template":
      // Legacy route — no template picker; booth goes straight to result.
      return <BengkelPhotobooth />;
    case "/bengkel/print":
      // Legacy — print step removed; send to result.
      return <BengkelResultPage />;
    case "/bengkel/result":
      return <BengkelResultPage />;
    case "/bengkel/point":
      return <BengkelPointPage />;
    default:
      return <BengkelHomeLanding />;
  }
}
