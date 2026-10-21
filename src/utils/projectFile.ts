import { defaultDataSettings } from "./dataPlan";
import { defaultPowerSettings } from "./powerPlan";
import { defaultPickSettings, type PickSettings } from "./pickList";
import { defaultToggles } from "./testPattern";
import type { Units } from "./units";
import { defaultContent, type Content } from "./content";
import { defaultDistro, type DistroSettings } from "./distro";
import { clampCount, clampSide, defaultCanvasSetup, MAX_CANVASES, type CanvasSetup } from "./sharedCanvas";
import { videoFrames } from "./videoFrames";
import { defaultCurve } from "./curve";
import type { LedPanel } from "../data/ledPanels";
import { newScreenState, type ScreenState } from "./screenModel";
import { cleanShow, collectShow, type ShowData } from "./show";

export type ProjectInfo = {
  name: string;
  client: string;
  venue: string;
  engineer: string;
  revision: string;
  notes: string;
};

export type ProjectFile = {
  app: "open-av-toolkit";
  version: 1;
  savedAt: string;
  units: Units;
  project: ProjectInfo;
  screens: ScreenState[];
  activeId: string;
  pickSettings: PickSettings;
  picked: Record<string, boolean>;
  /** Cabinets the person added that aren't in the built-in list */
  customPanels: LedPanel[];
  distro: DistroSettings;
  /** How many canvases the screens are laid out on, and how big they are */
  canvasSetup: CanvasSetup;
  /** The signal diagram, gear and lists. Missing in older files and in projects with none. */
  show?: ShowData;
};

export const emptyProject = (): ProjectFile => ({
  app: "open-av-toolkit",
  version: 1,
  savedAt: "",
  units: "metric",
  project: { name: "", client: "", venue: "", engineer: "", revision: "Rev A", notes: "" },
  screens: [newScreenState("s1", "Screen 1")],
  activeId: "s1",
  pickSettings: defaultPickSettings,
  picked: {},
  customPanels: [],
  distro: defaultDistro,
  canvasSetup: defaultCanvasSetup,
});

const STORAGE_KEY = "open-av-toolkit.project";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;

const cleanPanels = (v: unknown): LedPanel[] => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: LedPanel[] = [];
  for (const x of v.slice(0, 100)) {
    if (!isObj(x)) continue;
    const model = str(x.model).trim();
    const n = (k: string) => (typeof x[k] === "number" && Number.isFinite(x[k]) && (x[k] as number) > 0 ? (x[k] as number) : 0);
    if (!model || seen.has(model) || !n("pitch") || !n("width") || !n("height")) continue;
    seen.add(model);
    out.push({
      manufacturer: str(x.manufacturer, "Custom") || "Custom",
      model,
      pitch: n("pitch"),
      width: n("width"),
      height: n("height"),
      weight: n("weight"),
      maxPower: n("maxPower"),
      category: "Custom",
    });
  }
  return out;
};

const cleanCanvasSetup = (v: unknown): CanvasSetup => {
  const o = isObj(v) ? v : {};
  const num = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? Math.max(16, Math.min(16384, Math.round(x))) : d);
  const mode = typeof o.mode === "string" && (o.mode === "fit" || o.mode === "custom" || videoFrames.some((f) => f.id === o.mode)) ? o.mode : "fit";
  return { count: clampCount(typeof o.count === "number" ? o.count : 1), mode, customW: num(o.customW, defaultCanvasSetup.customW), customH: num(o.customH, defaultCanvasSetup.customH), across: clampSide(typeof o.across === "number" ? o.across : 1), down: clampSide(typeof o.down === "number" ? o.down : 1) };
};

const cleanNames = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (isObj(v)) {
    for (const [k, val] of Object.entries(v)) {
      if (/^\d{1,3}$/.test(k) && typeof val === "string" && val.trim()) out[k] = val.trim().slice(0, 16);
    }
  }
  return out;
};

const cleanDistro = (v: unknown): DistroSettings => {
  const o = isObj(v) ? v : {};
  const n = (k: keyof DistroSettings, lo: number, hi: number) =>
    typeof o[k] === "number" && Number.isFinite(o[k]) ? Math.min(hi, Math.max(lo, o[k] as number)) : (defaultDistro[k] as number);
  return {
    ways: Math.round(n("ways", 1, 48)),
    feedLengthM: n("feedLengthM", 0, 500),
    cableMm2: n("cableMm2", 1.5, 120),
    mainsLengthM: n("mainsLengthM", 0, 1000),
    mainsMm2: n("mainsMm2", 1.5, 120),
    generatorMargin: n("generatorMargin", 0, 200),
    maxDropPct: n("maxDropPct", 0.5, 20),
    perScreen: o.perScreen === true,
    names: cleanNames(o.names),
  };
};

const cleanContent = (v: unknown): Content => {
  const o = isObj(v) ? v : {};
  const bit = o.bitDepth === 10 || o.bitDepth === 12 ? o.bitDepth : 8;
  const fps = typeof o.fps === "number" && Number.isFinite(o.fps) ? Math.min(250, Math.max(1, Math.round(o.fps))) : defaultContent.fps;
  return { bitDepth: bit, fps };
};

const scaleList = (v: unknown): number[] =>
  Array.isArray(v) ? v.slice(0, 200).map((x) => (x === 0.5 ? 0.5 : 1)) : [];

/** Fills in anything missing, so files from older versions still open. */
function cleanScreen(raw: unknown, index: number): ScreenState | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id, `s${index + 1}`);
  const base = newScreenState(id, str(raw.name, `Screen ${index + 1}`));
  return {
    ...base,
    manufacturer: str(raw.manufacturer),
    model: str(raw.model),
    processor: str(raw.processor),
    distribution: str(raw.distribution),
    unitsPerLink: num(raw.unitsPerLink, 1, 1, 20),
    wide: num(raw.wide, 10, 1, 200),
    high: num(raw.high, 5, 1, 200),
    dataSettings: { ...defaultDataSettings, ...(isObj(raw.dataSettings) ? raw.dataSettings : {}) },
    numberingMode: str(raw.numberingMode, "standard"),
    redundancy: raw.redundancy === "backup" ? "backup" : "primary",
    backupSame: raw.backupSame === true,
    removedKeys: Array.isArray(raw.removedKeys) ? raw.removedKeys.filter((k): k is string => typeof k === "string") : [],
    customChains: Array.isArray(raw.customChains) ? (raw.customChains as ScreenState["customChains"]) : null,
    powerSettings: { ...defaultPowerSettings, ...(isObj(raw.powerSettings) ? raw.powerSettings : {}) },
    customCircuits: Array.isArray(raw.customCircuits) ? (raw.customCircuits as ScreenState["customCircuits"]) : null,
    canvasTitle: str(raw.canvasTitle),
    curve: { ...defaultCurve, ...(isObj(raw.curve) ? raw.curve : {}) },
    toggles: { ...defaultToggles, ...(isObj(raw.toggles) ? raw.toggles : {}) },
    content: cleanContent(raw.content),
    canvasPos:
      isObj(raw.canvasPos) && typeof raw.canvasPos.x === "number" && typeof raw.canvasPos.y === "number"
        ? { x: Math.max(0, Math.round(raw.canvasPos.x)), y: Math.max(0, Math.round(raw.canvasPos.y)) }
        : null,
    canvasIndex:
      typeof raw.canvasIndex === "number" && Number.isFinite(raw.canvasIndex) ? Math.max(0, Math.min(MAX_CANVASES - 1, Math.round(raw.canvasIndex))) : null,
    rowScale: scaleList(raw.rowScale),
    colScale: scaleList(raw.colScale),
  };
}

/** Reads a saved project, or returns null if it isn't one. */
export function parseProject(text: string): ProjectFile | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (!isObj(raw) || raw.app !== "open-av-toolkit" || !Array.isArray(raw.screens)) return null;
    const screens = raw.screens.map(cleanScreen).filter((s): s is ScreenState => s !== null);
    if (screens.length === 0) return null;
    // Screen ids must be unique.
    const seen = new Set<string>();
    screens.forEach((s, i) => {
      if (seen.has(s.id)) s.id = `${s.id}-${i}`;
      seen.add(s.id);
    });
    const info = isObj(raw.project) ? raw.project : {};
    const base = emptyProject();
    return {
      ...base,
      savedAt: str(raw.savedAt),
      units: raw.units === "imperial" ? "imperial" : "metric",
      project: {
        name: str(info.name),
        client: str(info.client),
        venue: str(info.venue),
        engineer: str(info.engineer),
        revision: str(info.revision, "Rev A"),
        notes: str(info.notes),
      },
      screens,
      customPanels: cleanPanels(raw.customPanels),
      distro: cleanDistro(raw.distro),
      canvasSetup: cleanCanvasSetup(raw.canvasSetup),
      activeId: screens.some((s) => s.id === raw.activeId) ? (raw.activeId as string) : screens[0].id,
      pickSettings: {
        ...defaultPickSettings,
        ...(isObj(raw.pickSettings) ? raw.pickSettings : {}),
        prices: isObj(raw.pickSettings) && isObj(raw.pickSettings.prices) ? (raw.pickSettings.prices as Record<string, number>) : {},
      },
      ...(cleanShow(raw.show) ? { show: cleanShow(raw.show) } : {}),
      picked: isObj(raw.picked)
        ? Object.fromEntries(Object.entries(raw.picked).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean>
        : {},
    };
  } catch {
    return null;
  }
}

/** The file as text. It carries the show held in this browser, unless the project already has its own (a shared one). */
export const projectText = (p: ProjectFile) => JSON.stringify({ ...p, show: p.show ?? collectShow() ?? undefined, savedAt: new Date().toISOString() }, null, 1);

export function loadSaved(): ProjectFile | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? parseProject(text) : null;
  } catch {
    return null;
  }
}

/** Returns false if the browser refused (private window, storage full). */
export function saveLocal(p: ProjectFile): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, projectText(p));
    return true;
  } catch {
    return false;
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

export function downloadProject(p: ProjectFile) {
  const base = (p.project.name || "led-project").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "led-project";
  const url = URL.createObjectURL(new Blob([projectText(p)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}.ledproject.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
