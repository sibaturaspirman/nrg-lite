/** Butik newspaper strip — 2×2 photo grid on t-butik-v2.jpg */

export const STRIP_W = 1000;
export const STRIP_H = 1414;
export const STRIP_ASPECT = `${STRIP_W} / ${STRIP_H}`;

/** Capture / slot aspect (1190×1104). */
export const CAPTURE_W = 1190;
export const CAPTURE_H = 1104;
export const CAPTURE_RATIO = CAPTURE_W / CAPTURE_H;

export const BUTIK_TEMPLATE = "/images/bt/t-butik-v2.jpg";
export const TEMPLATES = [BUTIK_TEMPLATE] as const;
export const PRINT_TEMPLATES = [BUTIK_TEMPLATE] as const;

export type SlotLayout = {
  /** Grid left inset as fraction of strip width. */
  left: number;
  /** Grid top inset as fraction of strip height. */
  top: number;
  /** Cell width as fraction of strip width. */
  cellW: number;
  /** Cell height as fraction of strip height. */
  cellH: number;
  /** Horizontal gap between columns as fraction of strip width. */
  gapX: number;
  /** Vertical gap between rows as fraction of strip height. */
  gapY: number;
  /**
   * Horizontal shift of template art only (fraction of strip width).
   * Photos stay fixed. Negative = kiri, positive = kanan.
   */
  shiftX: number;
};

/** Measured from t-butik-v2.jpg frame lines (2×2). */
export const DEFAULT_PREVIEW_LAYOUT: SlotLayout = {
  left: 0.068,
  top: 0.255,
  cellW: 0.411,
  cellH: 0.27,
  gapX: 0.041,
  gapY: 0.027,
  shiftX: 0,
};

export const PREVIEW_LAYOUT = DEFAULT_PREVIEW_LAYOUT;

export const DEFAULT_PRINT_LAYOUT: SlotLayout = {
  ...DEFAULT_PREVIEW_LAYOUT,
};

/** @deprecated */
export const DEFAULT_PRINT_LAYOUT_LEFT = DEFAULT_PRINT_LAYOUT;
/** @deprecated */
export const DEFAULT_PRINT_LAYOUT_RIGHT = DEFAULT_PRINT_LAYOUT;
export const PRINT_LAYOUT_LEFT = DEFAULT_PRINT_LAYOUT;
export const PRINT_LAYOUT_RIGHT = DEFAULT_PRINT_LAYOUT;

export const LAYOUT_STORAGE_KEY = "butikGridLayoutsV3";

export type StoredLayouts = {
  preview: SlotLayout;
  print: SlotLayout;
};

export function defaultLayouts(): StoredLayouts {
  return {
    preview: { ...DEFAULT_PREVIEW_LAYOUT },
    print: { ...DEFAULT_PRINT_LAYOUT },
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
    typeof o.gapX === "number" &&
    typeof o.gapY === "number"
  );
}

function normalizeLayout(v: unknown, fallback: SlotLayout): SlotLayout {
  if (!isSlotLayout(v)) return { ...fallback };
  return {
    left: v.left,
    top: v.top,
    cellW: v.cellW,
    cellH: v.cellH,
    gapX: v.gapX,
    gapY: v.gapY,
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
      print: normalizeLayout(
        (data as { print?: unknown }).print ??
          (data as { printLeft?: unknown }).printLeft,
        defaults.print,
      ),
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

/** 2×2 grid: index 0 TL, 1 TR, 2 BL, 3 BR. */
export function photoSlotRect(index: number, layout: SlotLayout) {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const width = STRIP_W * layout.cellW;
  const height = STRIP_H * layout.cellH;
  const left =
    STRIP_W * layout.left + col * (STRIP_W * layout.cellW + STRIP_W * layout.gapX);
  const top =
    STRIP_H * layout.top + row * (STRIP_H * layout.cellH + STRIP_H * layout.gapY);
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

export function warmStripAssets() {
  void fetch(BUTIK_TEMPLATE, {
    credentials: "same-origin",
    cache: "force-cache",
  }).catch(() => {});
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
  templateSrc: string = BUTIK_TEMPLATE,
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

  ctx.fillStyle = "#e8e0d4";
  ctx.fillRect(0, 0, width, height);

  const shiftPx = (layout.shiftX ?? 0) * width;
  ctx.drawImage(template, shiftPx, 0, width, height);

  const scaleX = width / STRIP_W;
  const scaleY = height / STRIP_H;

  for (let i = 0; i < 4; i++) {
    const shot = shots[i];
    if (!shot) continue;
    const img = await loadImage(shot);
    const { left, top, width: pw, height: ph } = photoSlotRect(i, layout);
    drawCover(ctx, img, left * scaleX, top * scaleY, pw * scaleX, ph * scaleY);
  }

  return canvas.toDataURL("image/jpeg", 1);
}

/** Single A5 newspaper composite (no left/right dual). */
export async function buildPrintStrip(
  shots: string[],
  printTemplateSrc: string = BUTIK_TEMPLATE,
  printLayout: SlotLayout = DEFAULT_PRINT_LAYOUT,
): Promise<string> {
  return compositeStrip(shots, printTemplateSrc, printLayout);
}

/** @deprecated use buildPrintStrip — kept for older imports */
export async function buildDualPrintStrip(
  shots: string[],
  printTemplateSrc: string = BUTIK_TEMPLATE,
  printLeft: SlotLayout = DEFAULT_PRINT_LAYOUT,
  _printRight?: SlotLayout,
): Promise<string> {
  return buildPrintStrip(shots, printTemplateSrc, printLeft);
}
