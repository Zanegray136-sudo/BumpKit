import { jsPDF } from "jspdf";
import { outputSize, outputsTouched, clampSide, type CanvasSetup, type Placed } from "./sharedCanvas";
import { safeAreas } from "./videoFrames";

type Size = { width: number; height: number };
type RGB = [number, number, number];

/**
 * A guide for the video team: one page per canvas with the canvas size, each screen's
 * position and size in pixels, the outputs it uses and the SMPTE safe areas, drawn to scale.
 */
export function buildContentGuide(opts: {
  projectName: string;
  placed: Placed[];
  sizes: Size[];
  setup: CanvasSetup;
  paper: "a4" | "letter";
}): jsPDF {
  const { placed, sizes, setup } = opts;
  const doc = new jsPDF({ unit: "mm", format: opts.paper });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const ink: RGB = [22, 27, 31];
  const muted: RGB = [96, 108, 118];
  const line: RGB = [214, 219, 223];
  const text = (s: string, x: number, y: number, size = 10, style = "normal", colour: RGB = ink, align: "left" | "right" | "center" = "left") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    doc.text(s, x, y, { align });
  };
  const palette: RGB[] = [[59, 130, 246], [16, 185, 129], [245, 158, 11], [236, 72, 153], [139, 92, 246], [6, 182, 212], [239, 68, 68], [132, 204, 22]];
  const out = outputSize(setup);
  const across = clampSide(setup.across);
  const down = clampSide(setup.down);

  sizes.forEach((size, ci) => {
    if (ci > 0) doc.addPage();
    const here = placed.filter((p) => p.canvas === ci);
    text(opts.projectName || "Video content guide", M, 24, 18, "bold");
    text(`Canvas ${ci + 1} of ${sizes.length}`, W - M, 24, 10, "normal", muted, "right");
    text(`${size.width} x ${size.height} px${out && across * down > 1 ? `, ${across} x ${down} outputs of ${out.width} x ${out.height}` : ""}`, M, 32, 11, "normal", muted);
    doc.setDrawColor(...line);
    doc.line(M, 36, W - M, 36);

    // To-scale drawing of the canvas
    const boxW = W - M * 2;
    const boxH = Math.min(110, boxW * (size.height / Math.max(size.width, 1)));
    const k = Math.min(boxW / Math.max(size.width, 1), boxH / Math.max(size.height, 1));
    const dw = size.width * k;
    const dh = size.height * k;
    const ox = M + (boxW - dw) / 2;
    const oy = 44;
    doc.setFillColor(15, 20, 25);
    doc.rect(ox, oy, dw, dh, "F");
    here.forEach((p) => {
      const col = palette[placed.findIndex((x) => x.id === p.id) % palette.length];
      doc.setFillColor(...col);
      doc.setDrawColor(...col);
      doc.setGState(doc.GState({ opacity: 0.35 }));
      doc.rect(ox + p.x * k, oy + p.y * k, p.w * k, p.h * k, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
      doc.setLineWidth(0.4);
      doc.rect(ox + p.x * k, oy + p.y * k, p.w * k, p.h * k, "S");
      text(p.name, ox + (p.x + p.w / 2) * k, oy + (p.y + p.h / 2) * k + 1, Math.max(7, Math.min(12, p.w * k * 0.9 / Math.max(p.name.length, 4) * 2.4)), "bold", [255, 255, 255], "center");
    });
    // Safe areas and output edges, per output
    if (out) {
      doc.setLineWidth(0.25);
      for (let r = 0; r < down; r++)
        for (let c = 0; c < across; c++) {
          const sx = ox + c * out.width * k;
          const sy = oy + r * out.height * k;
          safeAreas(out.width, out.height).forEach((a) => {
            doc.setDrawColor(...(a.id === "action" ? ([245, 158, 11] as RGB) : ([34, 211, 238] as RGB)));
            doc.setLineDashPattern([1.2, 0.8], 0);
            doc.rect(sx + a.x * k, sy + a.y * k, a.width * k, a.height * k, "S");
          });
          if (across * down > 1) {
            doc.setDrawColor(161, 161, 170);
            doc.setLineDashPattern([2, 1.2], 0);
            doc.rect(sx, sy, out.width * k, out.height * k, "S");
            text(`Output ${r * across + c + 1}`, sx + 1.5, sy + 4, 7, "bold", [200, 200, 205]);
          }
        }
      doc.setLineDashPattern([], 0);
    }
    text(out ? "Orange: action safe 93%.  Cyan: title safe 90%.  Dashed grey: output edges." : "This canvas is sized to fit its screens, so there are no safe areas.", M, oy + dh + 6, 8, "normal", muted);

    // Screen table
    let y = oy + dh + 18;
    const cols: [string, number][] = [["Screen", 0], ["Size px", 0.36], ["Position X, Y", 0.55], ["Right, bottom", 0.74]];
    const showOut = out && across * down > 1;
    if (showOut) cols.push(["Outputs", 0.9]);
    const cw = W - M * 2;
    cols.forEach(([h, f]) => text(h, M + cw * f, y, 8, "bold", muted));
    y += 3;
    doc.setDrawColor(...line);
    doc.line(M, y, W - M, y);
    y += 6;
    for (const p of here) {
      if (y > H - 30) break;
      const row = [p.name, `${p.w} x ${p.h}`, `${p.x}, ${p.y}`, `${p.x + p.w}, ${p.y + p.h}`, ...(showOut ? [outputsTouched(p, setup).join(", ")] : [])];
      cols.forEach(([, f], i) => text(row[i], M + cw * f, y, 9.5, i === 0 ? "bold" : "normal"));
      y += 7;
    }
    if (here.length === 0) text("No screens on this canvas.", M, y, 10, "normal", muted);
    text("One pixel of the content is one LED pixel. Send content at the canvas size, with nothing scaled.", M, H - 16, 8, "normal", muted);
    text("Generated with PixelPlan", W / 2, H - 9, 8, "normal", muted, "center");
  });
  return doc;
}
