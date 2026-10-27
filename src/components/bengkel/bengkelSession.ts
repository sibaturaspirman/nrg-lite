/**
 * In-memory handoff for large JPEG data URLs.
 * sessionStorage (~5MB) can't hold max-quality strips / 4R dual prints.
 */

const SHOTS_KEY = "bengkelShots";
const PHOTO_KEY = "bengkelShot";
const PRINT_KEY = "bengkelPrint";

let shotsMemory: string[] | null = null;
let photoMemory: string | null = null;
let printMemory: string | null = null;

export function setBengkelShots(shots: string[]) {
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

function isValidShots(data: unknown): data is string[] {
  return (
    Array.isArray(data) &&
    data.length >= 1 &&
    data.every((x) => typeof x === "string" && x.length > 0)
  );
}

export function getBengkelShots(): string[] | null {
  if (shotsMemory && isValidShots(shotsMemory)) {
    return shotsMemory;
  }

  try {
    const raw = sessionStorage.getItem(SHOTS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (isValidShots(data)) {
      shotsMemory = data;
      return data;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearBengkelShots() {
  shotsMemory = null;
  try {
    sessionStorage.removeItem(SHOTS_KEY);
  } catch {
    // ignore
  }
}

export function setBengkelPhoto(dataUrl: string) {
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

export function getBengkelPhoto(): string | null {
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

export function setBengkelPrint(dataUrl: string) {
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

export function getBengkelPrint(): string | null {
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

export function clearBengkelPrintArtifacts() {
  printMemory = null;
  try {
    sessionStorage.removeItem(PRINT_KEY);
  } catch {
    // ignore
  }
}
