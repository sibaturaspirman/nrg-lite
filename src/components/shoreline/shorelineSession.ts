/**
 * In-memory handoff for large JPEG data URLs.
 * sessionStorage (~5MB) can't hold max-quality strips / 4R dual prints.
 */

const SHOTS_KEY = "shorelineShots";
const PHOTO_KEY = "shorelineShot";
const PRINT_KEY = "shorelinePrint";

let shotsMemory: string[] | null = null;
let photoMemory: string | null = null;
let printMemory: string | null = null;

export function setShorelineShots(shots: string[]) {
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

export function getShorelineShots(): string[] | null {
  if (
    shotsMemory &&
    shotsMemory.length === 2 &&
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
      data.length === 2 &&
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

export function clearShorelineShots() {
  shotsMemory = null;
  try {
    sessionStorage.removeItem(SHOTS_KEY);
  } catch {
    // ignore
  }
}

export function setShorelinePhoto(dataUrl: string) {
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

export function getShorelinePhoto(): string | null {
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

export function setShorelinePrint(dataUrl: string) {
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

export function getShorelinePrint(): string | null {
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

export function clearShorelinePrintArtifacts() {
  printMemory = null;
  try {
    sessionStorage.removeItem(PRINT_KEY);
  } catch {
    // ignore
  }
}
