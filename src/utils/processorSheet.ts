import type { ReportData } from "./reportPdf";

const pad = (v: string | number, n: number) => String(v).padEnd(n);

/**
 * A setup sheet for the person programming the processor. It lists what to
 * enter, not a vendor file: the screen's canvas, each output port's area, and
 * the signal the capacity figures assume.
 */
export function processorSheetText(d: ReportData): string {
  const out: string[] = [`${d.project.name || "LED wall"} - processor setup sheet`];
  if (d.project.venue) out.push(`Venue: ${d.project.venue}`);
  if (d.project.revision) out.push(`Revision: ${d.project.revision}`);
  out.push("Values are planned, not read from the hardware. Check them in the processor's own software.");

  [d, ...(d.extraScreens ?? [])].forEach((s, i) => {
    out.push("", "=".repeat(60), `${s.screenName || `Screen ${i + 1}`}`, "=".repeat(60));
    if (!s.screen) {
      out.push("No panel selected.");
      return;
    }
    const sc = s.screen;
    const pr = s.processor;
    out.push(
      `Panel:        ${sc.panelName} (${sc.pitch} mm pitch)`,
      `Layout:       ${sc.wide} x ${sc.high} cabinets, ${sc.cabinets} in the wall`,
      `Cabinet:      ${sc.cabinetWidth} x ${sc.cabinetHeight} mm${s.canvas ? `, ${s.canvas.cabW} x ${s.canvas.cabH} px` : ""}`,
      `Canvas:       ${sc.resWidth} x ${sc.resHeight} px (${sc.totalPixels.toLocaleString()} lit)`,
      `Processor:    ${pr ? `${pr.processorsRequired} x ${pr.name}` : "not selected"}`
    );
    if (pr) {
      out.push(
        `Signal:       ${pr.content ? `${pr.content.bitDepth}-bit, ${pr.content.fps} fps` : "not set"}`,
        `Loading:      ${pr.loadPct.toFixed(0)}% of ${pr.maxPixels.toLocaleString()} px, ${s.dataPlan.ports.filter((p) => p.cabinets > 0).length} of ${pr.ports} ports used`
      );
    }
    out.push(`Redundancy:   ${s.redundancy === "backup" ? "Backup port on every primary port" : "None"}`);
    if (s.distribution) out.push(`Distribution: ${s.distribution.units} x ${s.distribution.name}`);

    out.push("", "OUTPUT PORTS", `${pad("Port", 7)}${pad("Backup", 8)}${pad("Cabs", 6)}${pad("Pixels", 10)}${pad("Load", 7)}${pad("X", 7)}${pad("Y", 7)}${pad("W", 7)}H`);
    s.dataPlan.ports
      .filter((p) => p.cabinets > 0)
      .forEach((p) => {
        const a = s.canvas?.ports.find((x) => x.port === p.port);
        out.push(
          `${pad(`P${p.port}`, 7)}${pad(s.redundancy === "backup" ? `BP${p.port}` : "-", 8)}${pad(p.cabinets, 6)}${pad(p.pixels, 10)}${pad(`${p.loadPct.toFixed(0)}%`, 7)}${pad(a?.x ?? "-", 7)}${pad(a?.y ?? "-", 7)}${pad(a?.w ?? "-", 7)}${a?.h ?? "-"}`
        );
      });
    if (s.dataPlan.unassigned > 0) out.push(`WARNING: ${s.dataPlan.unassigned} cabinets are not on a port.`);

    out.push(
      "",
      "ON THE DAY",
      "  [ ] Set the output resolution and frame rate to match the canvas above",
      "  [ ] Load or enter the receiving-card settings for this panel",
      "  [ ] Set each port's area, or load the cabinet layout, from the table",
      "  [ ] Confirm cabinet order on each port against the cabling map",
      "  [ ] Run test patterns, then colour and brightness match",
      "  [ ] Save the configuration and keep a backup copy with the project"
    );
  });
  return out.join("\n");
}
