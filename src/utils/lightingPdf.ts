import { endAddress, fmtAddress, hangList, positionTotals, sorted, totals, usage, type Lighting, type PowerOptions } from "./lighting";

/** A landscape PDF: the patch list by address, the universes, then power, weight and the hang list. */
export async function downloadLightingPdf(l: Lighting, showName: string, fileBase: string, opts: PowerOptions = {}, paper: "a4" | "letter" = "a4") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: paper, orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 12;
  const date = new Date().toLocaleDateString();
  let first = true;

  const page = (title: string) => {
    if (!first) doc.addPage();
    first = false;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, m, m + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`${showName}  |  ${date}`, W - m, m + 4, { align: "right" });
    return m + 12;
  };

  const table = (title: string, cols: { t: string; w: number; right?: boolean }[], rows: string[][]) => {
    const total = cols.reduce((s, c) => s + c.w, 0);
    const k = (W - m * 2) / total;
    const cw = cols.map((c) => c.w * k);
    const rh = 6;
    let y = 0;
    const header = () => {
      y = page(title);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      let x = m;
      cols.forEach((c, i) => {
        doc.text(c.t, c.right ? x + cw[i] - 1 : x + 1, y, { align: c.right ? "right" : "left" });
        x += cw[i];
      });
      doc.setDrawColor(150, 150, 150);
      doc.line(m, y + 1.8, W - m, y + 1.8);
      y += rh;
      doc.setFont("helvetica", "normal");
    };
    header();
    for (const r of rows) {
      if (y > H - m) header();
      let x = m;
      r.forEach((cell, i) => {
        const t = doc.splitTextToSize(cell, cw[i] - 2)[0] ?? "";
        doc.text(t, cols[i].right ? x + cw[i] - 1 : x + 1, y, { align: cols[i].right ? "right" : "left" });
        x += cw[i];
      });
      y += rh;
    }
  };

  const byAddress = sorted(l, "address");
  table(
    "Patch list",
    [{ t: "Univ.addr", w: 20 }, { t: "Ends", w: 14 }, { t: "Label", w: 44 }, { t: "Fixture", w: 52 }, { t: "Mode", w: 36 }, { t: "Ch", w: 10, right: true }, { t: "Position", w: 34 }, { t: "Notes", w: 40 }],
    byAddress.map((f) => [fmtAddress(f.universe, f.address) || "unpatched", f.universe ? String(endAddress(f)) : "", f.label, `${f.brand} ${f.model}`.trim(), f.mode, String(f.channels), f.position, f.note])
  );

  const u = usage(l);
  if (u.length) {
    table(
      "Universes",
      [{ t: "Universe", w: 20 }, { t: "Fixtures", w: 20, right: true }, { t: "Channels used", w: 30, right: true }, { t: "Free", w: 20, right: true }, { t: "Full", w: 20, right: true }],
      u.map((x) => [String(x.universe), String(x.fixtures), String(x.used), String(x.free), `${Math.round((x.used / 512) * 100)}%`])
    );
  }

  const p = positionTotals(l, opts);
  const t = totals(l, opts);
  const volts = opts.volts ?? 230;
  table(
    `Power and weight (${volts} V, ${opts.breaker ?? 16} A breakers at ${Math.round((opts.load ?? 0.8) * 100)}%)`,
    [{ t: "Position", w: 40 }, { t: "Fixtures", w: 18, right: true }, { t: "Watts", w: 18, right: true }, { t: "Amps", w: 16, right: true }, { t: "Circuits", w: 18, right: true }, { t: "Weight kg", w: 22, right: true }, { t: "Missing data", w: 40 }],
    [
      ...p.map((x) => [x.position || "(no position)", String(x.fixtures), String(x.watts), String(x.amps), String(x.circuits), String(x.kg), [x.unknownPower ? `${x.unknownPower} no power` : "", x.unknownWeight ? `${x.unknownWeight} no weight` : ""].filter(Boolean).join(", ")]),
      ["Total", String(t.fixtures), String(t.watts), String(t.amps), String(t.circuits), String(t.kg), ""],
    ]
  );

  const h = hangList(l);
  if (h.length) table("Hang list", [{ t: "Position", w: 40 }, { t: "Qty", w: 12, right: true }, { t: "Fixture", w: 70 }, { t: "Mode", w: 50 }], h.map((r) => [r.position || "(no position)", String(r.qty), r.fixture, r.mode]));

  doc.save(`${fileBase}-lighting.pdf`);
}
