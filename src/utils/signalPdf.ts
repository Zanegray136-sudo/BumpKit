import { diagramBounds, diagramSvg, type Diagram } from "./signal";

/** The patch list as rows of text, in cable order. */
export function patchRows(d: Diagram): string[][] {
  const name = (id: string) => d.nodes.find((n) => n.id === id)?.label ?? "";
  return d.edges.map((e, i) => [String(i + 1), name(e.from), `Out ${e.fromPort + 1}`, name(e.to), `In ${e.toPort + 1}`, e.cable, e.format, e.length ? `${e.length} m` : "", e.label]);
}

/** Largest size that fits a box of w x h inside a frame, keeping its shape. */
export function fitInside(w: number, h: number, frameW: number, frameH: number): { w: number; h: number } {
  const k = Math.min(frameW / w, frameH / h);
  return { w: w * k, h: h * k };
}

function raster(svg: string, width: number, height: number, scale: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(width * scale);
      c.height = Math.round(height * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("could not draw diagram"));
    img.src = url;
  });
}

/** A landscape PDF: the diagram on page one, the patch list after it. */
export async function downloadSignalPdf(d: Diagram, showName: string, fileBase: string, paper: "a4" | "letter" = "a4") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 12;
  const date = new Date().toLocaleDateString();

  const head = (title: string) => {
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, m, m + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`${showName}  |  ${date}`, W - m, m + 4, { align: "right" });
  };

  head("Signal diagram");
  const b = diagramBounds(d);
  const svg = diagramSvg(d, "");
  const png = await raster(svg, b.width, b.height, 2);
  const fit = fitInside(b.width, b.height, W - m * 2, H - m * 2 - 12);
  doc.addImage(png, "PNG", m + (W - m * 2 - fit.w) / 2, m + 10, fit.w, fit.h);

  const rows = patchRows(d);
  if (rows.length) {
    const cols = [{ t: "No", w: 12 }, { t: "From", w: 52 }, { t: "Out", w: 18 }, { t: "To", w: 52 }, { t: "In", w: 18 }, { t: "Cable", w: 26 }, { t: "Format", w: 22 }, { t: "Length", w: 20 }, { t: "Label", w: 0 }];
    cols[8].w = W - m * 2 - cols.slice(0, 8).reduce((s, c) => s + c.w, 0);
    const rh = 6.5;
    let y = 0;
    const header = () => {
      doc.addPage();
      head("Patch list");
      y = m + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      let x = m;
      cols.forEach((c) => {
        doc.text(c.t, x + 1, y);
        x += c.w;
      });
      doc.setDrawColor(150, 150, 150);
      doc.line(m, y + 1.8, W - m, y + 1.8);
      y += rh;
      doc.setFont("helvetica", "normal");
    };
    header();
    rows.forEach((r) => {
      if (y > H - m) header();
      let x = m;
      r.forEach((cell, i) => {
        doc.text(doc.splitTextToSize(cell, cols[i].w - 2)[0] ?? "", x + 1, y);
        x += cols[i].w;
      });
      y += rh;
    });
  }
  doc.save(`${fileBase}-signal.pdf`);
}
