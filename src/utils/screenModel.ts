import { fmtKg, fmtMxM, getUnits } from "./units";
import { customPanelStamp, findPanel } from "../data/ledPanels";
import { processors } from "../data/processors";
import { calcDistribution, distributionUnits } from "../data/distribution";
import { calcPowerPlan, defaultPowerSettings, type PowerSettings } from "./powerPlan";
import { calcDataPlan, defaultDataSettings, type DataSettings } from "./dataPlan";
import { calcCanvas } from "./canvas";
import { buildPickList, type PickSettings } from "./pickList";
import { defaultToggles, type PatternToggles } from "./testPattern";
import { activeCabinets, type Pos } from "./wall";
import type { ReportData } from "./reportPdf";
import { capacityFactor, defaultContent, type Content } from "./content";
import { eqCount, pxSizes, sizeCounts, sizeName, isMixed, type Scale } from "./sizes";
import { calcCurve, defaultCurve, type CurveSettings } from "./curve";

/** Everything the person chooses for one screen. */
export type ScreenState = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  processor: string;
  distribution: string;
  unitsPerLink: number;
  wide: number;
  high: number;
  dataSettings: DataSettings;
  numberingMode: string;
  redundancy: string;
  backupSame: boolean;
  /** Cabinets cut out of the wall, as "row,col" */
  removedKeys: string[];
  /** null = suggested data map */
  customChains: Pos[][] | null;
  powerSettings: PowerSettings;
  /** null = suggested power map */
  customCircuits: Pos[][] | null;
  canvasTitle: string;
  toggles: PatternToggles;
  curve: CurveSettings;
  /** Height of each row, 1 = full or 0.5 = half. Rows past the end are full. */
  rowScale: number[];
  /** Width of each column, 1 = full or 0.5 = half. */
  colScale: number[];
  /** Signal bit depth and frame rate */
  content: Content;
  /** Where this screen sits on the combined canvas, null = packed automatically */
  canvasPos: { x: number; y: number } | null;
};

export const newScreenState = (id: string, name: string): ScreenState => ({
  id,
  name,
  manufacturer: "",
  model: "",
  processor: "",
  distribution: "",
  unitsPerLink: 1,
  wide: 10,
  high: 5,
  dataSettings: defaultDataSettings,
  numberingMode: "standard",
  redundancy: "primary",
  backupSame: false,
  removedKeys: [],
  customChains: null,
  powerSettings: defaultPowerSettings,
  customCircuits: null,
  canvasTitle: "",
  toggles: defaultToggles,
  curve: defaultCurve,
  rowScale: [],
  colScale: [],
  content: defaultContent,
  canvasPos: null,
});

export type ProjectContext = {
  projectName: string;
  client: string;
  venue: string;
  engineer: string;
  revision: string;
  notes: string;
  pickSettings: PickSettings;
  /** More than one screen in the project */
  multi: boolean;
};

/** Name printed on the test pattern when the person hasn't typed one. */
export const defaultCanvasTitle = (st: ScreenState, ctx: ProjectContext) =>
  ctx.multi ? [ctx.projectName, st.name].filter(Boolean).join(" - ") : ctx.projectName;

/** Works out the plans and totals for one screen (no pick list or report). */
export function computeCore(st: ScreenState, revision: string) {
  const { wide, high, processor, redundancy, backupSame, numberingMode, powerSettings } = st;

  const selectedPanel = findPanel(st.model);
  const selectedProcessor = processors.find((p) => p.model === processor);
  const unitBase = distributionUnits.find((u) => u.id === st.distribution);
  // Deeper colour and faster frame rates leave room for fewer pixels.
  const factor = capacityFactor(selectedProcessor, st.content);
  const effMaxPixels = selectedProcessor ? Math.round(selectedProcessor.maxPixels * factor) : 0;
  const effPixelsPerPort = selectedProcessor ? Math.round(selectedProcessor.pixelsPerPort * factor) : 650000;
  const selectedUnit = unitBase
    ? { ...unitBase, pixelsPerPort: unitBase.pixelsPerPort ? Math.round(unitBase.pixelsPerPort * factor) : unitBase.pixelsPerPort }
    : undefined;

  const removed = new Set(st.removedKeys);
  const cabinetCount = activeCabinets(wide, high, removed);
  const curvePlan = selectedPanel ? calcCurve(selectedPanel.width, wide, st.curve) : null;
  const scale: Scale = { rows: st.rowScale, cols: st.colScale };
  const mixed = isMixed(scale, wide, high);
  const eq = eqCount(scale, wide, high, removed);
  const sizes = selectedPanel ? pxSizes(scale, wide, high, selectedPanel.width, selectedPanel.height, selectedPanel.pitch) : { colPx: [], rowPx: [] };
  const sumTo = (a: number[], n: number) => a.slice(0, n).reduce((x, y) => x + y, 0);
  const widthMetres = selectedPanel ? (selectedPanel.width * sumTo(Array.from({ length: wide }, (_, c) => (scale.cols[c] === 0.5 ? 0.5 : 1)), wide)) / 1000 : 0;
  const heightMetres = selectedPanel ? (selectedPanel.height * sumTo(Array.from({ length: high }, (_, r) => (scale.rows[r] === 0.5 ? 0.5 : 1)), high)) / 1000 : 0;

  // Panels have a whole number of pixels, so round per cabinet
  // first and then multiply (rounding the total drifts on big walls).
  const cabinetPxW = selectedPanel ? Math.round(selectedPanel.width / selectedPanel.pitch) : 0;
  const cabinetPxH = selectedPanel ? Math.round(selectedPanel.height / selectedPanel.pitch) : 0;
  const resWidth = sumTo(sizes.colPx, wide);
  const resHeight = sumTo(sizes.rowPx, high);
  const pixelsAt = (r: number, c: number) => (sizes.colPx[c] ?? cabinetPxW) * (sizes.rowPx[r] ?? cabinetPxH);
  // Cut-out cabinets don't carry pixels.
  let totalPixels = 0;
  for (let r = 0; r < high; r++)
    for (let c = 0; c < wide; c++) if (!removed.has(`${r},${c}`)) totalPixels += pixelsAt(r, c);

  const totalWeight = selectedPanel ? selectedPanel.weight * eq : 0;
  const totalPower = selectedPanel ? selectedPanel.maxPower * eq : 0;

  const dataPlan = calcDataPlan({
    wide,
    high,
    settings: st.dataSettings,
    cabinetPixels: cabinetCount > 0 ? Math.max(1, Math.round(totalPixels / cabinetCount)) : cabinetPxW * cabinetPxH,
    pixelsAt: mixed ? pixelsAt : undefined,
    pixelsPerPort: Math.min(
      effPixelsPerPort,
      selectedUnit?.pixelsPerPort ?? Infinity
    ),
    removed,
    customChains: st.customChains,
  });

  const primaryPorts = selectedPanel ? dataPlan.ports.filter((p) => p.cabinets > 0).length : 0;
  const backupOn = redundancy === "backup";
  // Backup on the same processor uses a second set of its ports.
  const portsRequired = primaryPorts * (backupOn && backupSame ? 2 : 1);
  const hasNativeTenGig = !!selectedProcessor?.tenGigOutputs;
  const tenGigAvailable = selectedProcessor?.tenGigOutputs ?? selectedProcessor?.fibrePorts ?? 0;
  // Behind a distribution unit the reachable ports come from the 10G links.
  const unitCapacity =
    selectedUnit && selectedProcessor && hasNativeTenGig
      ? tenGigAvailable *
        Math.min(Math.max(1, st.unitsPerLink), selectedUnit.maxPerLink) *
        selectedUnit.outputs
      : 0;
  const availablePorts = unitCapacity || (selectedProcessor?.ethernetPorts ?? 0);

  const processorLoading =
    selectedProcessor && totalPixels
      ? ((totalPixels / effMaxPixels) * 100).toFixed(1)
      : "0";

  // A processor can run out of ports before it runs out of pixels,
  // so size the rig on whichever limit is hit first.
  const processorsRequired =
    selectedProcessor && totalPixels
      ? Math.max(
          Math.ceil(totalPixels / effMaxPixels),
          Math.ceil(portsRequired / availablePorts)
        ) * (backupOn && !backupSame ? 2 : 1)
      : 0;

  const overloaded = selectedProcessor
    ? totalPixels > effMaxPixels ||
      portsRequired > availablePorts * (backupOn && !backupSame ? 2 : 1) ||
      dataPlan.ports.some((p) => p.over)
    : false;

  const distributionPlan =
    selectedUnit && selectedProcessor && portsRequired > 0
      ? calcDistribution({
          unit: selectedUnit,
          portsRequired,
          totalPixels,
          unitsPerLink: st.unitsPerLink,
          tenGigAvailable,
          hasNativeTenGig,
          processorsRequired,
        })
      : null;
  const distributionWarnings = [
    ...(distributionPlan?.warnings ?? []),
    ...(selectedProcessor?.tenGigOutputs && !selectedUnit
      ? [
          `${selectedProcessor.model} outputs 10G. Add a distribution unit (Brompton XD or NovaStar CVT10) to get the 1G ports.`,
        ]
      : []),
  ];

  const canvasPlan = selectedPanel
    ? calcCanvas({ dataPlan, wide, high, cabW: cabinetPxW, cabH: cabinetPxH, removed, colPx: mixed ? sizes.colPx : undefined, rowPx: mixed ? sizes.rowPx : undefined })
    : null;

  const canvasStats: [string, string][] =
    selectedPanel && canvasPlan
      ? [
          ["Canvas", `${canvasPlan.width} x ${canvasPlan.height} px`],
          ["Aspect", (canvasPlan.width / Math.max(1, canvasPlan.height)).toFixed(3)],
          ["Panel", `${selectedPanel.manufacturer} ${selectedPanel.model}`],
          ["Pixel pitch", `${selectedPanel.pitch} mm`],
          ["Wall size", curvePlan ? `${fmtMxM(curvePlan.chordM, heightMetres)} (curved)` : fmtMxM(widthMetres, heightMetres)],
          ["Cabinets", `${cabinetCount}${wide * high - cabinetCount ? ` (${wide * high - cabinetCount} cut out)` : ""}`],
          ["Total pixels", totalPixels.toLocaleString()],
          ["Processor", selectedProcessor ? `${selectedProcessor.model}${processorsRequired > 1 ? ` x${processorsRequired}` : ""}` : "-"],
          ["Data ports", `${primaryPorts}${backupOn ? (backupSame ? " + backup (same processor)" : " + backup") : ""}`],
          ["Weight", fmtKg(totalWeight)],
          ["Max power", `${(totalPower / 1000).toFixed(2)} kW`],
          ["Revision", revision || "-"],
        ]
      : [];

  const powerPlan = calcPowerPlan(
    selectedPanel,
    wide,
    high,
    numberingMode,
    powerSettings,
    removed,
    st.customCircuits,
    scale
  );

  return {
    selectedPanel,
    selectedProcessor,
    selectedUnit,
    removed,
    cabinetCount,
    widthMetres,
    heightMetres,
    resWidth,
    resHeight,
    totalPixels,
    totalWeight,
    totalPower,
    dataPlan,
    primaryPorts,
    portsRequired,
    availablePorts,
    processorLoading,
    processorsRequired,
    overloaded,
    distributionPlan,
    distributionWarnings,
    canvasPlan,
    canvasStats,
    powerPlan,
    cabinetPxW,
    cabinetPxH,
    backupOn,
    curvePlan,
    scale,
    mixed,
    effMaxPixels,
    effPixelsPerPort,
    capacityFactor: factor,
    cabinetSizes: sizeCounts(scale, wide, high, removed),
  };
}

export type ScreenCore = ReturnType<typeof computeCore>;


/** The pick list for one screen. */
export function buildScreenPick(st: ScreenState, c: ScreenCore, pickSettings: PickSettings) {
  const { selectedPanel, selectedProcessor, selectedUnit, distributionPlan, dataPlan, powerPlan } = c;
  const { redundancy, powerSettings } = st;
  return selectedPanel
    ? buildPickList(
        {
          panelName: `${selectedPanel.manufacturer} ${selectedPanel.model}`,
          cabinets: c.cabinetCount,
          cabinetSizes: c.mixed
            ? c.cabinetSizes.map((x) => ({ label: sizeName(x.cf, x.rf), count: x.count }))
            : undefined,
          processorName: selectedProcessor
            ? `${selectedProcessor.manufacturer} ${selectedProcessor.model}`
            : "",
          processorsRequired: c.processorsRequired,
          distribution:
            selectedUnit && distributionPlan
              ? {
                  name: `${selectedUnit.manufacturer} ${selectedUnit.model}`,
                  units: distributionPlan.units,
                  links: distributionPlan.links,
                }
              : null,
          dataPlan,
          powerPlan,
          powerSettings,
          redundancy,
        },
        pickSettings
      )
    : [];
}

/** The report data for one screen. */
export function buildScreenReport(
  st: ScreenState,
  c: ScreenCore,
  ctx: ProjectContext,
  pickItems: ReturnType<typeof buildScreenPick>
): ReportData {
  const {
    selectedPanel, selectedProcessor, selectedUnit, removed, cabinetCount, widthMetres, heightMetres,
    resWidth, resHeight, totalPixels, totalWeight, totalPower, dataPlan, availablePorts, processorLoading,
    processorsRequired, distributionPlan, canvasPlan, canvasStats, powerPlan, curvePlan,
  } = c;
  const { wide, high, redundancy, backupSame, numberingMode, powerSettings } = st;
  return {    project: {
      name: ctx.projectName,
      client: ctx.client,
      venue: ctx.venue,
      engineer: ctx.engineer,
      revision: ctx.revision,
      notes: ctx.notes,
    },
    screenName: st.name,
    screenId: st.id,
    curve: curvePlan,
    screen: selectedPanel
      ? {
          panelName: `${selectedPanel.manufacturer} ${selectedPanel.model}`,
          pitch: selectedPanel.pitch,
          cabinetWidth: selectedPanel.width,
          cabinetHeight: selectedPanel.height,
          wide,
          high,
          cabinets: cabinetCount,
          cutOut: wide * high - cabinetCount,
          widthMetres,
          heightMetres,
          resWidth,
          resHeight,
          totalPixels,
          weightKg: totalWeight,
          maxPowerKw: totalPower / 1000,
          specSource: selectedPanel.specSource,
          powerEstimated: selectedPanel.powerEstimated,
        }
      : null,
    processor: selectedProcessor
      ? {
          name: `${selectedProcessor.manufacturer} ${selectedProcessor.model}`,
          maxPixels: c.effMaxPixels,
          content: st.content,
          capacityFactor: c.capacityFactor,
          ports: availablePorts,
          loadPct: Number(processorLoading),
          processorsRequired,
          specSource: selectedProcessor.specSource,
        }
      : null,
    distribution:
      selectedUnit && distributionPlan
        ? {
            name: `${selectedUnit.manufacturer} ${selectedUnit.model}`,
            outputs: selectedUnit.outputs,
            units: distributionPlan.units,
            links: distributionPlan.links,
            pixelsPerLink: distributionPlan.pixelsPerLink,
            warnings: distributionPlan.warnings,
            specSource: selectedUnit.specSource,
          }
        : null,
    numberingMode,
    redundancy,
    backupSame,
    removed,
    canvas: canvasPlan,
    canvasStats,
    canvasTitle: st.canvasTitle.trim() || defaultCanvasTitle(st, ctx),
    canvasToggles: st.toggles,
    scale: c.scale,
    cabinetSizes: c.mixed ? c.cabinetSizes.map((x) => ({ label: sizeName(x.cf, x.rf), count: x.count })) : undefined,
    dataPlan,
    powerPlan,
    powerSettings,
    pickList: pickItems,
  };
}

/** Everything for one screen, in one go (used by tests). */
export function computeScreen(st: ScreenState, ctx: ProjectContext) {
  const core = computeCore(st, ctx.revision);
  const pickItems = buildScreenPick(st, core, ctx.pickSettings);
  return { ...core, pickItems, reportData: buildScreenReport(st, core, ctx, pickItems) };
}

/** Plans are cached per screen object, so editing one screen leaves the others alone. */
const coreCache = new WeakMap<ScreenState, { revision: string; core: ScreenCore }>();
export function getCore(st: ScreenState, revision: string): ScreenCore {
  // The unit system changes how some figures are written, so it is part of the cache key.
  const key = `${revision}|${getUnits()}|${customPanelStamp()}`;
  const hit = coreCache.get(st);
  if (hit && hit.revision === key) return hit.core;
  const core = computeCore(st, revision);
  coreCache.set(st, { revision: key, core });
  return core;
}

/** Adds the same item from several screens together. */
export function mergePickLists<T extends { key: string; need: number; spare: number; total: number; section: string; name: string; custom?: boolean }>(
  lists: T[][]
): T[] {
  const byKey = new Map<string, T>();
  lists.forEach((list) =>
    list.forEach((item) => {
      const have = byKey.get(item.key);
      // Extra items typed in by hand are the same on every screen.
      if (have && item.custom) return;
      if (have) {
        have.need += item.need;
        have.spare += item.spare;
        have.total += item.total;
      } else {
        byKey.set(item.key, { ...item });
      }
    })
  );
  return [...byKey.values()];
}
