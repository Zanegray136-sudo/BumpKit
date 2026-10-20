import { describe, it, expect } from "vitest";
import { inflateSync } from "node:zlib";
import { crc32, filterRows, assemblePng, isOpaque, encodePng } from "../src/utils/pngEncode";

/** Read a PNG back to RGB so the test can compare pixels. */
async function decode(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let at = 8;
  let w = 0;
  let h = 0;
  const idat: Uint8Array[] = [];
  while (at < bytes.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...bytes.slice(at + 4, at + 8));
    const data = bytes.slice(at + 8, at + 8 + len);
    const crc = view.getUint32(at + 8 + len);
    expect(crc).toBe(crc32(bytes.slice(at + 4, at + 8 + len)));
    if (type === "IHDR") {
      w = new DataView(data.buffer).getUint32(0);
      h = new DataView(data.buffer).getUint32(4);
    }
    if (type === "IDAT") idat.push(data);
    at += 12 + len;
  }
  const raw = new Uint8Array(inflateSync(Buffer.concat(idat.map((d) => Buffer.from(d)))));
  const rowLen = w * 3;
  const px = new Uint8Array(rowLen * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (rowLen + 1)];
    for (let i = 0; i < rowLen; i++) {
      const x = raw[y * (rowLen + 1) + 1 + i];
      const a = i >= 3 ? px[y * rowLen + i - 3] : 0;
      const b = y > 0 ? px[(y - 1) * rowLen + i] : 0;
      const c = i >= 3 && y > 0 ? px[(y - 1) * rowLen + i - 3] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      px[y * rowLen + i] = (x + pred) & 255;
    }
  }
  return { w, h, px };
}

const picture = (w: number, h: number) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      d[i] = (x * 7) & 255;
      d[i + 1] = x < w / 2 ? 255 : (y * 5) & 255;
      d[i + 2] = (x ^ y) & 255;
      d[i + 3] = 255;
    }
  return d;
};

describe("png encoder", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
  it("round-trips every pixel", async () => {
    const d = picture(37, 23);
    const out = await decode(await encodePng(d, 37, 23));
    expect([out.w, out.h]).toEqual([37, 23]);
    for (let i = 0; i < 37 * 23; i++) {
      expect(out.px[i * 3]).toBe(d[i * 4]);
      expect(out.px[i * 3 + 1]).toBe(d[i * 4 + 1]);
      expect(out.px[i * 3 + 2]).toBe(d[i * 4 + 2]);
    }
  });
  it("writes a valid signature and header", () => {
    const png = assemblePng(2, 1, new Uint8Array([0]));
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(2);
  });
  it("makes flat colour very small", async () => {
    const d = new Uint8ClampedArray(400 * 400 * 4).fill(255);
    const blob = await encodePng(d, 400, 400);
    expect(blob.size < 2000).toBe(true);
  });
  it("only handles opaque pictures", () => {
    expect(isOpaque(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]))).toBe(true);
    expect(isOpaque(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 128]))).toBe(false);
  });
  it("makes one filter byte per row", () => {
    const rows = filterRows(picture(5, 4), 5, 4);
    expect(rows.length).toBe((5 * 3 + 1) * 4);
  });
});
