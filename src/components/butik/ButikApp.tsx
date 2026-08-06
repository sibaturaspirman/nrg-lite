"use client";

import { useEffect, useState } from "react";
import { ButikHomeLanding } from "@/components/butik/ButikHomeLanding";
import { ButikPhotobooth } from "@/components/butik/ButikPhotobooth";
import { ButikPointPage } from "@/components/butik/ButikPointPage";
import { ButikPrintPage } from "@/components/butik/ButikPrintPage";
import { ButikReadyPage } from "@/components/butik/ButikReadyPage";
import { ButikResultPage } from "@/components/butik/ButikResultPage";
import { ButikTncPage } from "@/components/butik/ButikTncPage";
import { warmButikAssets } from "@/components/butik/butikAssetCache";
import { persistButikDocuments } from "@/components/butik/butikDocumentCache";
import {
  getButikPath,
  subscribeButikPath,
  warmButikRouteCache,
} from "@/components/butik/butikNav";

/**
 * Client shell: all BT screens in one bundle.
 * In-app navigation uses History API → works fully offline after first load.
 */
export function ButikApp() {
  const [path, setPath] = useState("/butik");

  useEffect(() => {
    setPath(getButikPath());
    warmButikRouteCache();
    void warmButikAssets();
    void persistButikDocuments();
    return subscribeButikPath(setPath);
  }, []);

  switch (path) {
    case "/butik/tnc":
      return <ButikTncPage />;
    case "/butik/ready":
      return <ButikReadyPage />;
    case "/butik/booth":
      return <ButikPhotobooth />;
    case "/butik/template":
      // Legacy route — no template picker; booth goes straight to print.
      return <ButikPhotobooth />;
    case "/butik/print":
      return <ButikPrintPage />;
    case "/butik/result":
      return <ButikResultPage />;
    case "/butik/point":
      return <ButikPointPage />;
    default:
      return <ButikHomeLanding />;
  }
}
