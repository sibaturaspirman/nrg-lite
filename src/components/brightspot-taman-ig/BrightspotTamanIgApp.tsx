"use client";

import { useEffect, useState } from "react";
import { BrightspotTamanIgHomeLanding } from "@/components/brightspot-taman-ig/BrightspotTamanIgHomeLanding";
import { BrightspotTamanIgPhotobooth } from "@/components/brightspot-taman-ig/BrightspotTamanIgPhotobooth";
import { BrightspotTamanIgPointPage } from "@/components/brightspot-taman-ig/BrightspotTamanIgPointPage";
import { BrightspotTamanIgReadyPage } from "@/components/brightspot-taman-ig/BrightspotTamanIgReadyPage";
import { BrightspotTamanIgResultPage } from "@/components/brightspot-taman-ig/BrightspotTamanIgResultPage";
import { BrightspotTamanIgTemplatePage } from "@/components/brightspot-taman-ig/BrightspotTamanIgTemplatePage";
import { BrightspotTamanIgTncPage } from "@/components/brightspot-taman-ig/BrightspotTamanIgTncPage";
import { warmBtigAssets } from "@/components/brightspot-taman-ig/btigAssetCache";
import { persistBtigDocuments } from "@/components/brightspot-taman-ig/btigDocumentCache";
import {
  getBtigPath,
  subscribeBtigPath,
  warmBtigRouteCache,
} from "@/components/brightspot-taman-ig/btigNav";

/**
 * Client shell: all Brightspot Taman IG screens in one bundle.
 * In-app navigation uses History API → works fully offline after first load.
 */
export function BrightspotTamanIgApp() {
  const [path, setPath] = useState("/brightspot-taman-ig");

  useEffect(() => {
    setPath(getBtigPath());
    warmBtigRouteCache();
    void warmBtigAssets();
    void persistBtigDocuments();
    return subscribeBtigPath(setPath);
  }, []);

  switch (path) {
    case "/brightspot-taman-ig/tnc":
      return <BrightspotTamanIgTncPage />;
    case "/brightspot-taman-ig/ready":
      return <BrightspotTamanIgReadyPage />;
    case "/brightspot-taman-ig/booth":
      return <BrightspotTamanIgPhotobooth />;
    case "/brightspot-taman-ig/template":
      return <BrightspotTamanIgTemplatePage />;
    case "/brightspot-taman-ig/print":
      // Legacy — print step removed; send to result.
      return <BrightspotTamanIgResultPage />;
    case "/brightspot-taman-ig/result":
      return <BrightspotTamanIgResultPage />;
    case "/brightspot-taman-ig/point":
      return <BrightspotTamanIgPointPage />;
    default:
      return <BrightspotTamanIgHomeLanding />;
  }
}
