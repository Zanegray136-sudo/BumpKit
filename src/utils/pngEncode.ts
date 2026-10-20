/**
 * A small PNG writer. The browser's own canvas export stores a transparent channel and uses a quick
 * compression setting. For the flat colours of a test pattern, three channels with a per-row filter choice
 * give a file about half the size, with exactly the same pixels.
 */

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Raw PNG scanlines (a filter byte, then the row) for 8-bit RGB, choosing the best filter for each row. */
export function filterRows(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Uint8Array {
  const bpp = 3;
  const rowLen = width * bpp;
  const out = new Uint8Array((rowLen + 1) * height);
  let prev = new Uint8Array(rowLen);
  let cur = new Uint8Array(rowLen);
  const cand = [0, 1, 2, 3, 4].map(() => new Uint8Array(rowLen));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      cur[x * 3] = rgba[s];
      cur[x * 3 + 1] = rgba[s + 1];
      cur[x * 3 + 2] = rgba[s + 2];
    }
    let best = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      const o = cand[f];
      let score = 0;
      for (let i = 0; i < rowLen; i++) {
        const a = i >= bpp ? cur[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
        const v = (cur[i] - pred) & 255;
        o[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
    }
    out[y * (rowLen + 1)] = best;
    out.set(cand[best], y * (rowLen + 1) + 1);
    [prev, cur] = [cur, prev];
  }
  return out;
}

const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

function chunk(type: string, data: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(type);
  const body = new Uint8Array(4 + data.length);
  body.set(name, 0);
  body.set(data, 4);
  const out = new Uint8Array(12 + data.length);
  out.set(u32(data.length), 0);
  out.set(body, 4);
  out.set(u32(crc32(body)), 8 + data.length);
  return out;
}

/** Wrap compressed scanlines (zlib format) into a PNG file. */
export function assemblePng(width: number, height: number, zlibData: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  ihdr.set(u32(width), 0);
  ihdr.set(u32(height), 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibData),
    chunk("IEND", new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export const canOptimisePng = () => typeof CompressionStream !== "undefined";

/** True when every pixel is fully opaque, which the three-channel file needs. */
export function isOpaque(rgba: Uint8ClampedArray | Uint8Array): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) return false;
  return true;
}

/** Encode opaque RGBA pixels as a compact PNG. */
export async function encodePng(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Promise<Blob> {
  const z = await deflate(filterRows(rgba, width, height));
  return new Blob([assemblePng(width, height, z) as BlobPart], { type: "image/png" });
}

/** A canvas as a PNG blob, as small as we can make it. Falls back to the browser's export. */
export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const browser = () => new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  try {
    if (!canOptimisePng()) return await browser();
    const ctx = canvas.getContext("2d");
    if (!ctx) return await browser();
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!isOpaque(data)) return await browser();
    const mine = await encodePng(data, canvas.width, canvas.height);
    // Keep the browser's file if, for some picture, it turns out smaller.
    const theirs = await browser();
    return theirs && theirs.size < mine.size ? theirs : mine;
  } catch {
    return await browser();
  }
}
