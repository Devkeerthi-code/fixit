import { describe, expect, it, vi } from "vitest";
import { MAX_BYTES, MAX_SIDE, PhotoError, fitWithin, resizePhoto, type ImagePlatform } from "./imageResize";

/** A fake canvas: output size grows with pixels and quality, like a real encoder. */
function fakePlatform({ width, height, webp = true, bytesPerPixel = 1 }: { width: number; height: number; webp?: boolean; bytesPerPixel?: number }) {
  const calls: Array<{ width: number; height: number; type: string; quality: number }> = [];
  const platform: ImagePlatform = {
    decode: vi.fn(async () => ({ width, height, source: {} as CanvasImageSource, close: vi.fn() })),
    encode: vi.fn(async (_src, w, h, type, quality) => {
      calls.push({ width: w, height: h, type, quality });
      const outType = type === "image/webp" && !webp ? "image/png" : type;
      const size = Math.round(w * h * bytesPerPixel * quality);
      return new Blob([new Uint8Array(size)], { type: outType });
    }),
  };
  return { platform, calls };
}

const photo = (type = "image/jpeg") => new File([new Uint8Array(10)], "IMG_2041.HEIC.jpg", { type });

describe("fitWithin", () => {
  it("scales the longest side down to 1280 and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_SIDE, height: 960 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: MAX_SIDE });
  });

  it("never upscales a small photo", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("resizePhoto", () => {
  it("encodes WebP at 1280px when the first quality already fits", async () => {
    const { platform, calls } = fakePlatform({ width: 4000, height: 3000, bytesPerPixel: 0.2 });
    const out = await resizePhoto(photo(), platform);
    expect(out.type).toBe("image/webp");
    expect(out.name).toBe("IMG_2041.HEIC.webp");
    expect(out.size).toBeLessThanOrEqual(MAX_BYTES);
    const real = calls.filter((c) => c.width > 1);
    expect(real[0]).toMatchObject({ width: 1280, height: 960, type: "image/webp", quality: 0.82 });
  });

  it("lowers quality step by step until the file is under 450 KB", async () => {
    const { platform, calls } = fakePlatform({ width: 1280, height: 960, bytesPerPixel: 0.6 });
    const out = await resizePhoto(photo(), platform);
    expect(out.size).toBeLessThanOrEqual(MAX_BYTES);
    const qualities = calls.filter((c) => c.width > 1).map((c) => c.quality);
    expect(qualities).toEqual([0.82, 0.72, 0.62]);
  });

  it("shrinks the dimensions when even the lowest quality is too big", async () => {
    const { platform, calls } = fakePlatform({ width: 1280, height: 960, bytesPerPixel: 1.2 });
    const out = await resizePhoto(photo(), platform);
    expect(out.size).toBeLessThanOrEqual(MAX_BYTES);
    expect(calls.some((c) => c.width === 1024)).toBe(true);
  });

  it("falls back to JPEG where the browser can't encode WebP", async () => {
    const { platform, calls } = fakePlatform({ width: 2000, height: 1000, webp: false, bytesPerPixel: 0.2 });
    const out = await resizePhoto(photo(), platform);
    expect(out.type).toBe("image/jpeg");
    expect(out.name.endsWith(".jpg")).toBe(true);
    expect(calls.filter((c) => c.width > 1).every((c) => c.type === "image/jpeg")).toBe(true);
  });

  it("refuses files that aren't images", async () => {
    const { platform } = fakePlatform({ width: 10, height: 10 });
    await expect(resizePhoto(photo("application/pdf"), platform)).rejects.toBeInstanceOf(PhotoError);
  });

  it("explains when a photo can't be decoded", async () => {
    const { platform } = fakePlatform({ width: 10, height: 10 });
    platform.decode = vi.fn(async () => {
      throw new Error("bad");
    });
    await expect(resizePhoto(photo(), platform)).rejects.toThrow("Couldn't read this photo");
  });
});
