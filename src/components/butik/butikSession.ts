/**
 * In-memory handoff for large JPEG data URLs.
 * sessionStorage (~5MB) can't hold max-quality strips / 4R dual prints.
 */

const SHOTS_KEY = "butikShots";
const PHOTO_KEY = "butikShot";
const PRINT_KEY = "butikPrint";

let shotsMemory: string[] | null = null;
let photoMemory: string | null = null;
let printMemory: string | null = null;

export function setButikShots(shots: string[]) {
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

export function getButikShots(): string[] | null {
  if (
    shotsMemory &&
    shotsMemory.length === 4 &&
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
      data.length === 4 &&
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

export function clearButikShots() {
  shotsMemory = null;
  try {
    sessionStorage.removeItem(SHOTS_KEY);
  } catch {
    // ignore
  }
}

export function setButikPhoto(dataUrl: string) {
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

export function getButikPhoto(): string | null {
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

export function setButikPrint(dataUrl: string) {
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

export function getButikPrint(): string | null {
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

export function clearButikPrintArtifacts() {
  printMemory = null;
  try {
    sessionStorage.removeItem(PRINT_KEY);
  } catch {
    // ignore
  }
}
