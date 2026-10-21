import { circuitPlan, endAddress, fmtAddress, hangList, onPosition, planOf, planPoints, positionOrder, positionTotals, sorted, totals, trussPlacement, usage, type Lighting, type PowerOptions } from "./lighting";
import { netOf, netRows, netHeader, netChecks } from "./lightingNet";

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
    [{ t: "Univ.addr", w: 20 }, { t: "Ends", w: 14 }, { t: "Label", w: 44 }, { t: "Fixture", w: 52 }, { t: "Mode", w: 36 }, { t: "Ch", w: 10, right: true }, { t: "Position", w: 30 }, { t: "Colour", w: 18 }, { t: "Notes", w: 34 }],
    byAddress.map((f) => [fmtAddress(f.universe, f.address) || "unpatched", f.universe ? String(endAddress(f)) : "", f.label, `${f.brand} ${f.model}`.trim(), f.mode, String(f.channels), f.position, f.colour ?? "", f.note])
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

  // ---- stage plan (top view) and side view, drawn to scale
  const hue = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  };
  const hsl = (h: number, sat = 0.7, lig = 0.55): [number, number, number] => {
    const c = (1 - Math.abs(2 * lig - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lig - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  };
  const poly = (pts: [number, number][], style: "S" | "FD") => {
    const [first, ...rest] = pts;
    doc.lines(rest.map((q, i) => [q[0] - (i === 0 ? first[0] : rest[i - 1][0]), q[1] - (i === 0 ? first[1] : rest[i - 1][1])] as [number, number]), first[0], first[1], [1, 1], style, true);
  };
  const plan = planOf(l);
  const order = positionOrder(l);
  if (l.fixtures.length) {
    const y0 = page("Stage plan (top view)");
    const availW = W - m * 2 - 10;
    const availH = H - y0 - m - 8;
    const k = Math.min(availW / plan.w, availH / plan.d);
    const ox = m + 5 + (availW - plan.w * k) / 2;
    const oy = y0 + 4;
    const X = (v: number) => ox + v * k;
    const Y = (v: number) => oy + v * k;
    doc.setLineWidth(0.1);
    doc.setDrawColor(215, 215, 215);
    for (let x = 0; x <= plan.w; x++) doc.line(X(x), Y(0), X(x), Y(plan.d));
    for (let y = 0; y <= plan.d; y++) doc.line(X(0), Y(y), X(plan.w), Y(y));
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.4);
    doc.rect(X(0), Y(0), plan.w * k, plan.d * k);
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text("Upstage", X(plan.w / 2), Y(0) - 1.2, { align: "center" });
    doc.text("Audience", X(plan.w / 2), Y(plan.d) + 4, { align: "center" });
    doc.text(`${plan.w} x ${plan.d} m, grid 1 m`, X(0), Y(plan.d) + 4);
    const corners = (cx: number, cy: number, w: number, d: number, rot: number): [number, number][] => {
      const a = (rot * Math.PI) / 180;
      return ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as [number, number][]).map(([px, py]) => [X(cx + px * Math.cos(a) - py * Math.sin(a)), Y(cy + px * Math.sin(a) + py * Math.cos(a))]);
    };
    for (const o of plan.objects ?? []) {
      doc.setFillColor(225, 225, 230);
      doc.setDrawColor(120, 120, 130);
      doc.setLineWidth(0.25);
      poly(corners(o.x, o.y, o.w, o.d, o.rot), "FD");
      doc.setFontSize(6.5);
      doc.setTextColor(60, 60, 70);
      doc.text(o.name, X(o.x), Y(o.y) + 1, { align: "center" });
    }
    for (const name of order) {
      const t = trussPlacement(l, name);
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(70, 70, 70);
      doc.setLineWidth(0.3);
      poly(corners(t.x, t.y, t.len, 0.4, t.rot), "FD");
      doc.setFontSize(7);
      doc.setTextColor(20, 20, 20);
      doc.text(`${name} (${onPosition(l, name).length})`, X(t.x), Y(t.y) - 0.28 * k - 1.2, { align: "center" });
    }
    const pts = planPoints(l);
    const byId = new Map(l.fixtures.map((f) => [f.id, f]));
    let loose = 0;
    for (const q of pts) {
      const f = byId.get(q.id);
      if (!f) continue;
      if (!q.placed) {
        loose++;
        continue;
      }
      const [r, g, b] = hsl(hue(`${f.brand} ${f.model}`));
      doc.setFillColor(r, g, b);
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.2);
      const rad = Math.max(1.6, Math.min(3.2, 0.3 * k));
      doc.circle(X(q.x), Y(q.y), rad, "FD");
      doc.setFontSize(Math.min(7, rad * 2.4));
      doc.setTextColor(10, 10, 10);
      doc.text(q.onTruss ? String(q.slot) : "", X(q.x), Y(q.y) + rad * 0.35, { align: "center" });
    }
    if (loose) {
      doc.setFontSize(7);
      doc.setTextColor(150, 90, 0);
      doc.text(`${loose} fixture${loose === 1 ? "" : "s"} not placed on the plan yet`, W - m, Y(plan.d) + 4, { align: "right" });
    }

    if (order.length) {
      const y1 = page("Rig side view (seen from the audience)");
      const top = Math.max(8, ...order.map((n) => trussPlacement(l, n).h + 2));
      const aw = W - m * 2 - 10;
      const ah = H - y1 - m - 8;
      const ks = Math.min(aw / plan.w, ah / top);
      const sx = m + 5 + (aw - plan.w * ks) / 2;
      const SX = (v: number) => sx + v * ks;
      const SY = (v: number) => y1 + 4 + (top - v) * ks;
      doc.setLineWidth(0.1);
      doc.setDrawColor(215, 215, 215);
      for (let v = 0; v <= top; v++) doc.line(SX(0), SY(v), SX(plan.w), SY(v));
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.5);
      doc.line(SX(-0.3), SY(0), SX(plan.w + 0.3), SY(0));
      for (const name of order) {
        const t = trussPlacement(l, name);
        const half = Math.abs((Math.cos((t.rot * Math.PI) / 180) * t.len) / 2);
        doc.setDrawColor(70, 70, 70);
        doc.setLineWidth(1);
        doc.line(SX(t.x - half), SY(t.h), SX(t.x + half), SY(t.h));
        doc.setFontSize(7);
        doc.setTextColor(20, 20, 20);
        doc.text(`${name}, ${t.h} m`, SX(t.x), SY(t.h) - 2, { align: "center" });
        for (const q of planPoints(l).filter((p) => p.onTruss === name)) {
          const f = byId.get(q.id);
          if (!f) continue;
          const [r, g, b] = hsl(hue(`${f.brand} ${f.model}`));
          doc.setFillColor(r, g, b);
          doc.setDrawColor(30, 30, 30);
          doc.setLineWidth(0.2);
          doc.circle(SX(q.x), SY(t.h) + 3, 1.6, "FD");
          doc.setFontSize(5.5);
          doc.text(String(q.slot), SX(q.x), SY(t.h) + 6.4, { align: "center" });
        }
      }
    }
  }

  // ---- circuits
  const cp = circuitPlan(l, opts);
  if (cp.length) {
    table(
      `Circuits (${volts} V, ${opts.breaker ?? 16} A at ${Math.round((opts.load ?? 0.8) * 100)}%)`,
      [{ t: "Circuit", w: 16 }, { t: "Position", w: 40 }, { t: "Fixtures", w: 16, right: true }, { t: "Amps", w: 16, right: true }, { t: "On it", w: 150 }],
      cp.map((c) => [`C${c.circuit}`, c.position || "(no position)", String(c.fixtures.length), String(c.amps), c.fixtures.join(", ")])
    );
  }

  // ---- network
  const nodes = netOf(l);
  if (nodes.nodes.length) {
    table(`Network (${nodes.protocol === "artnet" ? "Art-Net" : "sACN"})`, [{ t: netHeader[0], w: 36 }, { t: netHeader[1], w: 30 }, { t: netHeader[2], w: 26 }, { t: netHeader[3], w: 22 }, { t: "Out", w: 10, right: true }, { t: "Univ.", w: 14, right: true }, { t: nodes.protocol === "artnet" ? "Net:Sub:Uni" : "sACN group", w: 28 }, { t: netHeader[7], w: 40 }], netRows(l));
    const nc = netChecks(l);
    if (nc.length) table("Network checks", [{ t: "Level", w: 14 }, { t: "Issue", w: 200 }], nc.map((c) => [c.level === "error" ? "Error" : "Warning", c.text]));
  }

  doc.save(`${fileBase}-lighting.pdf`);
}
