/**
 * In-memory handoff for large photo data URLs.
 * sessionStorage (~5MB) often can't hold full-quality composites.
 */

export const WEDDING_PHOTO_KEY = "weddingShot";
export const WEDDING_PHOTO_URL_KEY = "weddingUploadedUrl";

let photoMemory: string | null = null;

export function setWeddingPhoto(dataUrl: string) {
  photoMemory = dataUrl;
  try {
    sessionStorage.setItem(WEDDING_PHOTO_KEY, dataUrl);
  } catch {
    try {
      sessionStorage.removeItem(WEDDING_PHOTO_KEY);
    } catch {
      // ignore — memory remains source of truth
    }
  }
}

export function getWeddingPhoto(): string | null {
  if (photoMemory) return photoMemory;
  try {
    const v = sessionStorage.getItem(WEDDING_PHOTO_KEY);
    if (v) {
      photoMemory = v;
      return v;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearWeddingPhotoUrl() {
  try {
    sessionStorage.removeItem(WEDDING_PHOTO_URL_KEY);
  } catch {
    // ignore
  }
}
