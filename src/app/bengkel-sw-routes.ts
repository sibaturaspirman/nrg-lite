/** Shared with the service worker (no DOM / window). */
export const BENGKEL_ROUTES = [
  "/bengkel",
  "/bengkel/",
  "/bengkel/tnc",
  "/bengkel/ready",
  "/bengkel/booth",
  "/bengkel/template",
  "/bengkel/print",
  "/bengkel/result",
  "/bengkel/point",
] as const;

/** Reuses shoreline art until bengkel-specific assets exist. */
export const BENGKEL_ASSETS = [
  "/images/shoreline/bg.jpg",
  "/images/shoreline/logo.png",
  "/images/shoreline/tnc-new.png",
  "/images/shoreline/ready-moment.png",
  "/images/shoreline/btn-ready.png",
  "/images/shoreline/btn-capture.png",
  "/images/shoreline/title-booth.png",
  "/images/shoreline/template.png",
  "/images/bengkel/template.png",
  "/images/bengkel/title-booth.png",
  "/images/shoreline/discover.png",
  "/images/shoreline/scan.png",
  "/images/shoreline/you-got.png",
  "/images/shoreline/collect.png",
] as const;
