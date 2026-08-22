/** Brightspot Taman IG — Instagram templates (800×1066) + landscape slots 364×248. */

export const STRIP_W = 800;
export const STRIP_H = 1066;
export const STRIP_ASPECT = `${STRIP_W} / ${STRIP_H}`;

/** Capture / slot aspect (364×248 landscape). */
export const CAPTURE_W = 364;
export const CAPTURE_H = 248;
export const CAPTURE_RATIO = CAPTURE_W / CAPTURE_H;

export const TEMPLATES = [
  "/images/Z-IG-T1.jpg",
  "/images/Z-IG-T2.jpg",
  "/images/Z-IG-T3.jpg",
] as const;

export type SlotLayout = {
  /** Left inset as fraction of strip width. */
  left: number;
  /** Top inset as fraction of strip height. */
  top: number;
  /** Cell width as fraction of strip width. */
  cellW: number;
  /** Cell height as fraction of strip height. */
  cellH: number;
  /** Gap between stacked photos as fraction of strip height. */
  gap: number;
  /**
   * Horizontal shift of template art only (fraction of strip width).
   * Photos stay fixed. Negative = kiri, positive = kanan.
   */
  shiftX: number;
};

/**
 * 3 landscape shots stacked, horizontally centered on IG frame.
 * left = (1 − cellW) / 2 so the column sits in the middle.
 */
export const DEFAULT_PREVIEW_LAYOUT: SlotLayout = {
  left: (STRIP_W - CAPTURE_W) / 2 / STRIP_W,
  top: 0.055,
  cellW: CAPTURE_W / STRIP_W,
  cellH: CAPTURE_H / STRIP_H,
  gap: 0.028,
  shiftX: 0,
};

/** @deprecated use DEFAULT_PREVIEW_LAYOUT — kept for older imports */
export const PREVIEW_LAYOUT = DEFAULT_PREVIEW_LAYOUT;

export const LAYOUT_STORAGE_KEY = "brightspotTamanIgSlotLayoutsV9";

export type StoredLayouts = {
  preview: SlotLayout;
};

export function defaultLayouts(): StoredLayouts {
  return {
    preview: { ...DEFAULT_PREVIEW_LAYOUT },
  };
}

function isSlotLayout(v: unknown): v is SlotLayout {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.left === "number" &&
    typeof o.top === "number" &&
    typeof o.cellW === "number" &&
    typeof o.cellH === "number" &&
    typeof o.gap === "number"
  );
}

function normalizeLayout(v: unknown, fallback: SlotLayout): SlotLayout {
  if (!isSlotLayout(v)) return { ...fallback };
  return {
    left: v.left,
    top: v.top,
    cellW: v.cellW,
    cellH: v.cellH,
    gap: v.gap,
    shiftX: typeof v.shiftX === "number" ? v.shiftX : 0,
  };
}

export function loadLayouts(): StoredLayouts {
  const defaults = defaultLayouts();
  try {
    // Drop legacy square-strip layout keys from early IG port.
    for (const legacy of [
      "brightspotTamanIgSlotLayouts",
      "brightspotTamanIgSlotLayoutsV2",
      "brightspotTamanIgSlotLayoutsV3",
      "brightspotTamanIgSlotLayoutsV4",
      "brightspotTamanIgSlotLayoutsV5",
      "brightspotTamanIgSlotLayoutsV6",
      "brightspotTamanIgSlotLayoutsV7",
      "brightspotTamanIgSlotLayoutsV8",
      "brightspotTamanSlotLayouts",
    ]) {
      localStorage.removeItem(legacy);
    }
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return defaults;
    const data = JSON.parse(raw) as Partial<StoredLayouts>;
    const preview = normalizeLayout(data.preview, defaults.preview);
    // Guard: IG slots must stay landscape (364×248) and horizontally centered.
    if (preview.cellH >= preview.cellW) return defaults;
    if (preview.left < 0.2) return defaults;
    return { preview };
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

/** Stacked landscape slots: index 0 top → 2 bottom. */
export function photoSlotRect(index: number, layout: SlotLayout) {
  const width = STRIP_W * layout.cellW;
  const height = STRIP_H * layout.cellH;
  const left = STRIP_W * layout.left;
  const gap = STRIP_H * layout.gap;
  const top = STRIP_H * layout.top + index * (height + gap);
  return { left, top, width, height };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
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

/** Warm HTTP / SW cache for template art. */
export function warmStripAssets() {
  for (const src of TEMPLATES) {
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

  ctx.fillStyle = "#1a0508";
  ctx.fillRect(0, 0, width, height);

  const shiftPx = (layout.shiftX ?? 0) * width;
  ctx.drawImage(template, shiftPx, 0, width, height);

  const scaleX = width / STRIP_W;
  const scaleY = height / STRIP_H;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    if (!shot) continue;
    const img = await loadImage(shot);
    const { left, top, width: pw, height: ph } = photoSlotRect(i, layout);
    drawCover(
      ctx,
      img,
      left * scaleX,
      top * scaleY,
      pw * scaleX,
      ph * scaleY,
    );
  }

  return canvas.toDataURL("image/jpeg", 1);
}
