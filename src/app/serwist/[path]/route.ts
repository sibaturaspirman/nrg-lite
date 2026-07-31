import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import {
  BT_ASSETS,
  BT_ROUTES,
} from "@/components/brightspot-taman/btNav";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const btPages = [...BT_ROUTES, "/brightspot-taman/"] as const;

const btAssets = [
  ...BT_ASSETS,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
] as const;

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [...btPages, ...btAssets].map((url) => ({
      url,
      revision,
    })),
  });
