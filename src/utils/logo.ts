import { useState } from "react";

const KEY = "open-av-toolkit.logo";

export type Logo = { dataUrl: string; width: number; height: number };

/** The company logo saved in this browser, if any. */
export function getLogo(): Logo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.dataUrl === "string" && v.dataUrl.startsWith("data:image/") && v.width > 0 && v.height > 0) {
      return { dataUrl: v.dataUrl, width: Number(v.width), height: Number(v.height) };
    }
  } catch {
    /* none saved */
  }
  return null;
}

/** Returns false when the browser wouldn't keep it. */
export function saveLogo(logo: Logo | null): boolean {
  try {
    if (logo) localStorage.setItem(KEY, JSON.stringify(logo));
    else localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

const MAX_W = 400;
const MAX_H = 200;

/** Reads an image file and shrinks it so it stays small enough to save and embed. */
export function fileToLogo(file: File): Promise<Logo> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file (PNG, JPG or SVG)."));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("That image is over 10 MB. Use a smaller one."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w0 = img.naturalWidth || 300;
      const h0 = img.naturalHeight || 150;
      const k = Math.min(1, MAX_W / w0, MAX_H / h0);
      // SVGs can be tiny; scale those up so the saved copy isn't blurry.
      const up = file.type === "image/svg+xml" ? Math.min(MAX_W / w0, MAX_H / h0) : k;
      const width = Math.max(1, Math.round(w0 * up));
      const height = Math.max(1, Math.round(h0 * up));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("This browser couldn't read the image."));
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    img.src = url;
  });
}

/** The saved logo, with ways to change it. */
export function useLogo(): [Logo | null, (l: Logo | null) => boolean] {
  const [logo, setLogo] = useState<Logo | null>(() => getLogo());
  const set = (l: Logo | null) => {
    const ok = saveLogo(l);
    setLogo(l);
    return ok;
  };
  return [logo, set];
}
