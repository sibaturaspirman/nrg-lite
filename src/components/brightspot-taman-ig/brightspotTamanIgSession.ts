/**
 * In-memory handoff for large JPEG data URLs.
 * sessionStorage (~5MB) can't hold max-quality strips / 4R dual prints.
 */

const SHOTS_KEY = "brightspotTamanIgShots";
const PHOTO_KEY = "brightspotTamanIgShot";
const PRINT_KEY = "brightspotTamanIgPrint";

let shotsMemory: string[] | null = null;
let photoMemory: string | null = null;
let printMemory: string | null = null;

export function setBrightspotTamanIgShots(shots: string[]) {
  shotsMemory = shots;
  try {
    sessionStorage.setItem(SHOTS_KEY, JSON.stringify(shots));
  } catch {
    try {
      sessionStorage.removeItem(SHOTS_KEY);
    } catch {
      // ignore
    }
  }
}

export function getBrightspotTamanIgShots(): string[] | null {
  if (
    shotsMemory &&
    shotsMemory.length === 3 &&
    shotsMemory.every((x) => typeof x === "string" && x.length > 0)
  ) {
    return shotsMemory;
  }

  try {
    const raw = sessionStorage.getItem(SHOTS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      Array.isArray(data) &&
      data.length === 3 &&
      data.every((x) => typeof x === "string" && x.length > 0)
    ) {
      shotsMemory = data;
      return data;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearBrightspotTamanIgShots() {
  shotsMemory = null;
  try {
    sessionStorage.removeItem(SHOTS_KEY);
  } catch {
    // ignore
  }
}

export function setBrightspotTamanIgPhoto(dataUrl: string) {
  photoMemory = dataUrl;
  try {
    sessionStorage.setItem(PHOTO_KEY, dataUrl);
  } catch {
    try {
      sessionStorage.removeItem(PHOTO_KEY);
    } catch {
      // ignore — memory remains source of truth
    }
  }
}

export function getBrightspotTamanIgPhoto(): string | null {
  if (photoMemory) return photoMemory;
  try {
    const v = sessionStorage.getItem(PHOTO_KEY);
    if (v) {
      photoMemory = v;
      return v;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setBrightspotTamanIgPrint(dataUrl: string) {
  printMemory = dataUrl;
  try {
    sessionStorage.setItem(PRINT_KEY, dataUrl);
  } catch {
    try {
      sessionStorage.removeItem(PRINT_KEY);
    } catch {
      // ignore — memory remains source of truth
    }
  }
}

export function getBrightspotTamanIgPrint(): string | null {
  if (printMemory) return printMemory;
  try {
    const v = sessionStorage.getItem(PRINT_KEY);
    if (v) {
      printMemory = v;
      return v;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearBrightspotTamanIgPrintArtifacts() {
  printMemory = null;
  try {
    sessionStorage.removeItem(PRINT_KEY);
  } catch {
    // ignore
  }
}
