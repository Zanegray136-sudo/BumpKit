import { parseProject, type ProjectFile } from "./projectFile";
import { collectShow } from "./show";

const toB64Url = (bytes: Uint8Array) => {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export const canShare = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

/** The whole project squeezed into text that fits in a web address. */
export async function encodeProject(p: ProjectFile): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ ...p, show: p.show ?? collectShow() ?? undefined }));
  return toB64Url(await pipe(raw, new CompressionStream("gzip")));
}

export async function decodeProject(text: string): Promise<ProjectFile | null> {
  try {
    const raw = await pipe(fromB64Url(text), new DecompressionStream("gzip"));
    return parseProject(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
}

export async function makeShareUrl(p: ProjectFile): Promise<string> {
  const data = await encodeProject(p);
  return `${window.location.origin}${window.location.pathname}?p=${data}#/project`;
}
