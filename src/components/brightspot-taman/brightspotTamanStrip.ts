/** Shared strip compositing for Brightspot Taman preview + 4R print. */

export const STRIP_W = 1182;
export const STRIP_H = 3544;
export const STRIP_ASPECT = `${STRIP_W} / ${STRIP_H}`;

export const TEMPLATES = [
  "/images/bt/t1.png",
  "/images/bt/t2.png",
  "/images/bt/t3.png",
] as const;

/** Print-only backgrounds (print art). */
export const PRINT_TEMPLATES = [
  "/images/bt/t1-print-v2.jpg",
  "/images/bt/t2-print-v2.jpg",
  "/images/bt/t3-print-v2.jpg",
] as const;

export type SlotLayout = {
  /** Left inset as fraction of strip width. */
  left: number;
  /** Square photo size as fraction of strip width. */
  size: number;
  /** Top inset as fraction of strip height. */
  top: number;
  /** Gap between photos as fraction of strip height. */
  gap: number;
  /**
   * Horizontal shift of template art only (fraction of strip width).
   * Photos stay fixed. Negative = kiri, positive = kanan.
   */
  shiftX: number;
};

/** Preview / on-screen template slots. */
export const DEFAULT_PREVIEW_LAYOUT: SlotLayout = {
  left: 0.1,
  size: 0.8,
  top: 0.04,
  gap: 0.024,
  shiftX: 0,
};

/** @deprecated use DEFAULT_PREVIEW_LAYOUT — kept for older imports */
export const PREVIEW_LAYOUT = DEFAULT_PREVIEW_LAYOUT;

/**
 * Print slot layouts — tighter vertically to leave room for QR area,
 * with different left/right insets for the two 4R halves.
 */
export const DEFAULT_PRINT_LAYOUT_LEFT: SlotLayout = {
  left: 0.085,
  size: 0.74,
  top: 0.03,
  gap: 0.02,
  shiftX: 0,
};

export const DEFAULT_PRINT_LAYOUT_RIGHT: SlotLayout = {
  left: 0.115,
  size: 0.74,
  top: 0.03,
  gap: 0.02,
  shiftX: 0,
};

/** @deprecated */
export const PRINT_LAYOUT_LEFT = DEFAULT_PRINT_LAYOUT_LEFT;
/** @deprecated */
export const PRINT_LAYOUT_RIGHT = DEFAULT_PRINT_LAYOUT_RIGHT;

export const LAYOUT_STORAGE_KEY = "brightspotTamanSlotLayouts";

export type StoredLayouts = {
  preview: SlotLayout;
  printLeft: SlotLayout;
  printRight: SlotLayout;
};

export function defaultLayouts(): StoredLayouts {
  return {
    preview: { ...DEFAULT_PREVIEW_LAYOUT },
    printLeft: { ...DEFAULT_PRINT_LAYOUT_LEFT },
    printRight: { ...DEFAULT_PRINT_LAYOUT_RIGHT },
  };
}

function isSlotLayout(v: unknown): v is SlotLayout {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.left === "number" &&
    typeof o.size === "number" &&
    typeof o.top === "number" &&
    typeof o.gap === "number"
  );
}

function normalizeLayout(v: unknown, fallback: SlotLayout): SlotLayout {
  if (!isSlotLayout(v)) return { ...fallback };
  return {
    left: v.left,
    size: v.size,
    top: v.top,
    gap: v.gap,
    shiftX: typeof v.shiftX === "number" ? v.shiftX : 0,
  };
}

export function loadLayouts(): StoredLayouts {
  const defaults = defaultLayouts();
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return defaults;
    const data = JSON.parse(raw) as Partial<StoredLayouts>;
    return {
      preview: normalizeLayout(data.preview, defaults.preview),
      printLeft: normalizeLayout(data.printLeft, defaults.printLeft),
      printRight: normalizeLayout(data.printRight, defaults.printRight),
    };
  } catch {
    return defaults;
  }
}

export function saveLayouts(layouts: StoredLayouts) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // ignore quota
  }
}

export function photoSlotRect(index: number, layout: SlotLayout) {
  const size = STRIP_W * layout.size;
  const left = STRIP_W * layout.left;
  const gap = STRIP_H * layout.gap;
  const top = STRIP_H * layout.top + index * (size + gap);
  return { left, top, size };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Offline / SW: retry via fetch so Cache Storage can satisfy the request
      void fetch(src, { credentials: "same-origin", cache: "force-cache" })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load ${src}`);
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const img2 = new window.Image();
          img2.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img2);
          };
          img2.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load ${src}`));
          };
          img2.src = url;
        })
        .catch(reject);
    };
    img.src = src;
  });
}

/** Warm HTTP / SW cache for template + print art (call while online or from cache). */
export function warmStripAssets() {
  for (const src of [...TEMPLATES, ...PRINT_TEMPLATES]) {
    void fetch(src, { credentials: "same-origin", cache: "force-cache" }).catch(
      () => {},
    );
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const sw = src.naturalWidth;
  const sh = src.naturalHeight;
  const sourceRatio = sw / sh;
  const targetRatio = dw / dh;
  let cropW = sw;
  let cropH = sh;
  let cropX = 0;
  let cropY = 0;
  if (sourceRatio > targetRatio) {
    cropW = sh * targetRatio;
    cropX = (sw - cropW) / 2;
  } else {
    cropH = sw / targetRatio;
    cropY = (sh - cropH) / 2;
  }
  ctx.drawImage(src, cropX, cropY, cropW, cropH, dx, dy, dw, dh);
}

export async function compositeStrip(
  shots: string[],
  templateSrc: string,
  layout: SlotLayout = DEFAULT_PREVIEW_LAYOUT,
): Promise<string> {
  const template = await loadImage(templateSrc);
  const width = template.naturalWidth || STRIP_W;
  const height = template.naturalHeight || STRIP_H;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Fill edges when template is shifted (printer crop compensation)
  ctx.fillStyle = "#1a0508";
  ctx.fillRect(0, 0, width, height);

  const shiftPx = (layout.shiftX ?? 0) * width;
  ctx.drawImage(template, shiftPx, 0, width, height);

  const scaleX = width / STRIP_W;
  const scaleY = height / STRIP_H;

  for (let i = 0; i < 3; i++) {
    const shot = shots[i];
    if (!shot) continue;
    const img = await loadImage(shot);
    const { left, top, size } = photoSlotRect(i, layout);
    const s = size * scaleX;
    drawCover(ctx, img, left * scaleX, top * scaleY, s, s);
  }

  return canvas.toDataURL("image/jpeg", 1);
}

/** 4R: left + right strips with print templates and distinct slot layouts. */
export async function buildDualPrintStrip(
  shots: string[],
  printTemplateSrc: string,
  printLeft: SlotLayout = DEFAULT_PRINT_LAYOUT_LEFT,
  printRight: SlotLayout = DEFAULT_PRINT_LAYOUT_RIGHT,
): Promise<string> {
  const [leftStrip, rightStrip] = await Promise.all([
    compositeStrip(shots, printTemplateSrc, printLeft),
    compositeStrip(shots, printTemplateSrc, printRight),
  ]);
  const left = await loadImage(leftStrip);
  const right = await loadImage(rightStrip);
  const w = left.naturalWidth;
  const h = left.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(left, 0, 0, w, h);
  ctx.drawImage(right, w, 0, w, h);
  return canvas.toDataURL("image/jpeg", 1);
}
