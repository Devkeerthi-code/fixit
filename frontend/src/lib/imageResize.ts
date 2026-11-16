/*
  Phone photos are 3-8 MB; the server accepts JPEG/WebP under 500 KB. We shrink in the browser so a
  complaint uploads in a second on hostel Wi-Fi: longest side 1280px, WebP (JPEG where the browser can't
  encode WebP), and lower quality until the file is under 450 KB.
*/
export const MAX_SIDE = 1280;
export const MAX_BYTES = 450 * 1024;
export const MAX_PHOTOS = 3;
const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42];
const SCALES = [1, 0.8, 0.64, 0.5];

export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close?: () => void;
}

/** The two browser-dependent steps, injectable so the algorithm can be unit tested. */
export interface ImagePlatform {
  decode(file: Blob): Promise<DecodedImage>;
  encode(source: CanvasImageSource, width: number, height: number, type: string, quality: number): Promise<Blob | null>;
}

export class PhotoError extends Error {}

export function fitWithin(width: number, height: number, maxSide = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function renamed(name: string, type: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.${type === "image/webp" ? "webp" : "jpg"}`;
}

async function pickType(platform: ImagePlatform, img: DecodedImage): Promise<string> {
  const probe = await platform.encode(img.source, 1, 1, "image/webp", 0.8);
  return probe && probe.type === "image/webp" ? "image/webp" : "image/jpeg";
}

export async function resizePhoto(file: File, platform: ImagePlatform = browserPlatform): Promise<File> {
  if (!file.type.startsWith("image/")) throw new PhotoError("That file isn't a photo. Pick a JPEG or PNG image.");
  let img: DecodedImage;
  try {
    img = await platform.decode(file);
  } catch {
    throw new PhotoError("Couldn't read this photo. Try a JPEG or PNG.");
  }
  try {
    const type = await pickType(platform, img);
    const base = fitWithin(img.width, img.height);
    for (const scale of SCALES) {
      const width = Math.max(1, Math.round(base.width * scale));
      const height = Math.max(1, Math.round(base.height * scale));
      for (const quality of QUALITIES) {
        const blob = await platform.encode(img.source, width, height, type, quality);
        if (blob && blob.size <= MAX_BYTES) {
          return new File([blob], renamed(file.name, type), { type, lastModified: Date.now() });
        }
      }
    }
    throw new PhotoError("This photo is too detailed to send. Try a closer, simpler shot.");
  } finally {
    img.close?.();
  }
}

async function decodeInBrowser(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const el = new Image();
    el.decoding = "async";
    el.src = url;
    await el.decode();
    return { width: el.naturalWidth, height: el.naturalHeight, source: el };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodeInBrowser(source: CanvasImageSource, width: number, height: number, type: string, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export const browserPlatform: ImagePlatform = { decode: decodeInBrowser, encode: encodeInBrowser };
