"use client";

import { useEffect, useState } from "react";
import { ShorelineHomeLanding } from "@/components/shoreline/ShorelineHomeLanding";
import { ShorelinePhotobooth } from "@/components/shoreline/ShorelinePhotobooth";
import { ShorelinePointPage } from "@/components/shoreline/ShorelinePointPage";
import { ShorelineReadyPage } from "@/components/shoreline/ShorelineReadyPage";
import { ShorelineResultPage } from "@/components/shoreline/ShorelineResultPage";
import { ShorelineTncPage } from "@/components/shoreline/ShorelineTncPage";
import { warmShorelineAssets } from "@/components/shoreline/shorelineAssetCache";
import { persistShorelineDocuments } from "@/components/shoreline/shorelineDocumentCache";
import {
  getShorelinePath,
  subscribeShorelinePath,
  warmShorelineRouteCache,
} from "@/components/shoreline/shorelineNav";

/**
 * Client shell: all Shoreline screens in one bundle.
 * In-app navigation uses History API → works fully offline after first load.
 */
export function ShorelineApp() {
  const [path, setPath] = useState("/shoreline");

  useEffect(() => {
    setPath(getShorelinePath());
    warmShorelineRouteCache();
    void warmShorelineAssets();
    void persistShorelineDocuments();
    return subscribeShorelinePath(setPath);
  }, []);

  switch (path) {
    case "/shoreline/tnc":
      return <ShorelineTncPage />;
    case "/shoreline/ready":
      return <ShorelineReadyPage />;
    case "/shoreline/booth":
      return <ShorelinePhotobooth />;
    case "/shoreline/template":
      // Legacy route — no template picker; booth goes straight to result.
      return <ShorelinePhotobooth />;
    case "/shoreline/print":
      // Legacy — print step removed; send to result.
      return <ShorelineResultPage />;
    case "/shoreline/result":
      return <ShorelineResultPage />;
    case "/shoreline/point":
      return <ShorelinePointPage />;
    default:
      return <ShorelineHomeLanding />;
  }
}
