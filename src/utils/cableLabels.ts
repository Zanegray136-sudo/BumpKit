import type { CableRow } from "./cableSchedule";

/** A sheet of cable labels, two per run (one for each end), 3 across by 8 down. */
export async function downloadCableLabels(rows: CableRow[], projectName: string, paper: "a4" | "letter" = "a4") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: paper });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cols = 3;
  const perCol = 8;
  const mx = 10;
  const my = 12;
  const lw = (W - mx * 2) / cols;
  const lh = (H - my * 2) / perCol;

  const labels = rows.filter((r) => r.label).flatMap((r) => [r, r]);
  if (labels.length === 0) return;

  labels.forEach((r, i) => {
    const slot = i % (cols * perCol);
    if (i > 0 && slot === 0) doc.addPage();
    const x = mx + (slot % cols) * lw;
    const y = my + Math.floor(slot / cols) * lh;
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.15);
    doc.rect(x + 1, y + 1, lw - 2, lh - 2);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(r.id, x + lw / 2, y + lh * 0.42, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const to = doc.splitTextToSize(`${r.from}  >  ${r.to}`, lw - 6);
    doc.text(to.slice(0, 2), x + lw / 2, y + lh * 0.62, { align: "center" });
    if (r.screen) {
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 110);
      doc.text(r.screen, x + lw / 2, y + lh - 3.2, { align: "center" });
    }
  });

  const base = (projectName || "cables").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "cables";
  doc.save(`${base}-cable-labels.pdf`);
}
