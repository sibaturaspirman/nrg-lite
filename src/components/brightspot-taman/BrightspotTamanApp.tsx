"use client";

import { useEffect, useState } from "react";
import { BrightspotTamanHomeLanding } from "@/components/brightspot-taman/BrightspotTamanHomeLanding";
import { BrightspotTamanPhotobooth } from "@/components/brightspot-taman/BrightspotTamanPhotobooth";
import { BrightspotTamanPointPage } from "@/components/brightspot-taman/BrightspotTamanPointPage";
import { BrightspotTamanPrintPage } from "@/components/brightspot-taman/BrightspotTamanPrintPage";
import { BrightspotTamanReadyPage } from "@/components/brightspot-taman/BrightspotTamanReadyPage";
import { BrightspotTamanResultPage } from "@/components/brightspot-taman/BrightspotTamanResultPage";
import { BrightspotTamanTemplatePage } from "@/components/brightspot-taman/BrightspotTamanTemplatePage";
import { BrightspotTamanTncPage } from "@/components/brightspot-taman/BrightspotTamanTncPage";
import { warmBtAssets } from "@/components/brightspot-taman/btAssetCache";
import {
  getBtPath,
  subscribeBtPath,
  warmBtRouteCache,
} from "@/components/brightspot-taman/btNav";

/**
 * Client shell: all BT screens in one bundle.
 * In-app navigation uses History API → works fully offline after first load.
 */
export function BrightspotTamanApp() {
  const [path, setPath] = useState("/brightspot-taman");

  useEffect(() => {
    setPath(getBtPath());
    warmBtRouteCache();
    void warmBtAssets();
    return subscribeBtPath(setPath);
  }, []);

  switch (path) {
    case "/brightspot-taman/tnc":
      return <BrightspotTamanTncPage />;
    case "/brightspot-taman/ready":
      return <BrightspotTamanReadyPage />;
    case "/brightspot-taman/booth":
      return <BrightspotTamanPhotobooth />;
    case "/brightspot-taman/template":
      return <BrightspotTamanTemplatePage />;
    case "/brightspot-taman/print":
      return <BrightspotTamanPrintPage />;
    case "/brightspot-taman/result":
      return <BrightspotTamanResultPage />;
    case "/brightspot-taman/point":
      return <BrightspotTamanPointPage />;
    default:
      return <BrightspotTamanHomeLanding />;
  }
}
