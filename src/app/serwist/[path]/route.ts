import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const btPages = [
  "/brightspot-taman",
  "/brightspot-taman/",
  "/brightspot-taman/tnc",
  "/brightspot-taman/ready",
  "/brightspot-taman/booth",
  "/brightspot-taman/template",
  "/brightspot-taman/print",
  "/brightspot-taman/result",
  "/brightspot-taman/point",
];

const btAssets = [
  "/images/bt/bg.jpg",
  "/images/bt/logo.png",
  "/images/bt/tnc.png",
  "/images/bt/ready-moment.png",
  "/images/bt/btn-ready.png",
  "/images/bt/btn-capture.png",
  "/images/bt/btn-next.png",
  "/images/bt/title-booth.png",
  "/images/bt/title-template.png",
  "/images/bt/discover.png",
  "/images/bt/you-got.png",
  "/images/bt/t1.png",
  "/images/bt/t2.png",
  "/images/bt/t3.png",
  "/images/bt/t1-print-v2.jpg",
  "/images/bt/t2-print-v2.jpg",
  "/images/bt/t3-print-v2.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [...btPages, ...btAssets].map((url) => ({
      url,
      revision,
    })),
  });
