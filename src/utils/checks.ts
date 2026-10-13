import type { ReportData } from "./reportPdf";

export type Check = { level: "ok" | "warn" | "error"; text: string };

/** What a reviewer should know before trusting the numbers. */
export function reportChecks(d: ReportData): Check[] {
  const checks: Check[] = [];
  const s = d.screen;

  if (!s) {
    return [{ level: "error", text: "No panel selected." }];
  }

  const portsUsed = d.dataPlan.ports.filter((p) => p.cabinets > 0).length;

  if (!d.processor) {
    checks.push({ level: "warn", text: "No processor selected, so processor loading is not checked." });
  } else {
    if (s.totalPixels > d.processor.maxPixels) {
      checks.push({
        level: "error",
        text: `${s.totalPixels.toLocaleString()} pixels is over the ${d.processor.name} limit of ${d.processor.maxPixels.toLocaleString()}.`,
      });
    }
    if (portsUsed > d.processor.ports) {
      checks.push({
        level: "error",
        text: `Data plan uses ${portsUsed} ports but ${d.processor.name} has ${d.processor.ports}.`,
      });
    }
    if (s.totalPixels <= d.processor.maxPixels && portsUsed <= d.processor.ports) {
      checks.push({
        level: "ok",
        text: `${d.processor.name} loaded to ${d.processor.loadPct.toFixed(0)}% using ${portsUsed} of ${d.processor.ports} ports.`,
      });
    }
  }

  const overPorts = d.dataPlan.ports.filter((p) => p.over);
  if (overPorts.length) {
    checks.push({
      level: "error",
      text: `Over capacity: ${overPorts.map((p) => `P${p.port} (${p.loadPct.toFixed(0)}%)`).join(", ")}.`,
    });
  }
  if (d.dataPlan.unassigned > 0) {
    checks.push({
      level: "error",
      text: `${d.dataPlan.unassigned} cabinet${d.dataPlan.unassigned === 1 ? " is" : "s are"} not on any data port.`,
    });
  } else if (!overPorts.length) {
    checks.push({ level: "ok", text: "Every cabinet is on a data port and no port is over capacity." });
  }

  const p = d.powerPlan;
  if (p) {
    if (!p.fits) {
      checks.push({ level: "error", text: "One cabinet draws more than a circuit can carry." });
    }
    if (p.overloadedCircuits > 0) {
      checks.push({ level: "error", text: `${p.overloadedCircuits} circuit${p.overloadedCircuits === 1 ? " is" : "s are"} over the usable load.` });
    }
    if (p.unassigned > 0) {
      checks.push({ level: "error", text: `${p.unassigned} cabinet${p.unassigned === 1 ? " is" : "s are"} not on any power circuit.` });
    }
    if (d.powerSettings.supply === "three") {
      const amps = p.phaseAmps.map((x) => x.amps);
      const max = Math.max(...amps);
      const spread = max > 0 ? ((max - Math.min(...amps)) / max) * 100 : 0;
      if (spread > 10) {
        checks.push({ level: "warn", text: `Phases are out of balance by ${spread.toFixed(0)}%.` });
      }
    }
    if (p.fits && p.overloadedCircuits === 0 && p.unassigned === 0) {
      checks.push({ level: "ok", text: `${p.circuits.length} circuit${p.circuits.length === 1 ? "" : "s"} within the usable load.` });
    }
    p.rigWarnings.forEach((w) => checks.push({ level: "warn", text: w }));
  }

  if (d.processor && !d.processor.specSource) {
    checks.push({
      level: "warn",
      text: `${d.processor.name} capacity has not been checked against the manufacturer datasheet.`,
    });
  }
  if (d.distribution) {
    d.distribution.warnings.forEach((w) =>
      checks.push({ level: "warn", text: `${d.distribution!.name}: ${w}` })
    );
  }

  if (s.powerEstimated) {
    checks.push({
      level: "warn",
      text: `${s.panelName} power is an estimate, because the manufacturer does not publish it. Confirm before sizing circuits.`,
    });
  }
  if (!s.specSource) {
    checks.push({
      level: "warn",
      text: `${s.panelName} weight and power have not been checked against the manufacturer datasheet.`,
    });
  }

  return checks;
}

/** Checks for every screen in the project, each tagged with the screen's name. */
export function reportChecksAll(d: ReportData): Check[] {
  const list = [d, ...(d.extraScreens ?? [])];
  if (list.length === 1) return reportChecks(d);
  return list.flatMap((x) =>
    reportChecks(x).map((c) => ({ ...c, text: `${x.screenName || "Screen"}: ${c.text}` }))
  );
}

