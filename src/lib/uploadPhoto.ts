const UPLOAD_ENDPOINT =
  process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT ??
  "https://photo-ai-iims.zirolu.id/v1/iqos";

const UPLOAD_AUTH =
  process.env.NEXT_PUBLIC_UPLOAD_AUTH ??
  "de2e0cc3-65da-48a4-8473-484f29386d61:xZC8Zo4DAWR5Yh6Lrq4QE3aaRYJl9lss";

export type UploadPhotoResponse = {
  file: string;
  id: string | number;
  [key: string]: unknown;
};

export type UploadPhotoInput = {
  dataUrl: string;
  name?: string;
  phone?: string;
  fileName?: string;
  signal?: AbortSignal;
};

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function uploadPhoto({
  dataUrl,
  name = "IQOS Visitor",
  phone = `${Date.now()}`,
  fileName = `electric-side-${Date.now()}.png`,
  signal,
}: UploadPhotoInput): Promise<UploadPhotoResponse> {
  const blob = await dataUrlToBlob(dataUrl);

  const body = new FormData();
  body.append("name", name);
  body.append("phone", phone);
  body.append("file", blob, fileName);

  const res = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body,
    headers: {
      Authorization: UPLOAD_AUTH,
      Accept: "application/json",
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Upload gagal (HTTP ${res.status})`);
  }

  const json = (await res.json()) as Partial<UploadPhotoResponse>;
  if (!json || typeof json.file !== "string") {
    throw new Error("Respon upload tidak valid");
  }
  return json as UploadPhotoResponse;
}
