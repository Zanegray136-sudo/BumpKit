import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import { ledPanels, setCustomPanels, type LedPanel } from "./data/ledPanels";
import CustomPanels from "./components/CustomPanels";
import { processors } from "./data/processors";
import { distributionUnits } from "./data/distribution";
import { pageFromHash, pages, type PageId } from "./data/sections";
import {
  buildScreenPick,
  buildScreenReport,
  defaultCanvasTitle,
  getCore,
  mergePickLists,
  newScreenState,
  type ScreenState,
} from "./utils/screenModel";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ScreenBar from "./components/ScreenBar";
import PanelInfo from "./components/PanelInfo";
import PanelPicker from "./components/PanelPicker";
import ProcessorPicker from "./components/ProcessorPicker";
import ProcessorInfo from "./components/ProcessorInfo";
import ViewingDistance from "./components/ViewingDistance";
import { calcViewing } from "./utils/viewing";
import { backupState, fingerprint, loadRecord, recordSave, storeRecord, trackChange } from "./utils/backup";
import BackupReminder from "./components/BackupReminder";
import CurveSetup from "./components/CurveSetup";
import MixedSizes from "./components/MixedSizes";
import TargetSize from "./components/TargetSize";
import type { PickItem } from "./utils/pickList";
import { getCabinetLabel } from "./utils/cabinetLabels";
import type { SharedScreen } from "./components/SharedCanvas";
import ContentSettings from "./components/ContentSettings";
import PowerDistro from "./components/PowerDistro";
import { calcDistro, defaultDistro, type DistroSettings, type DistroCircuit } from "./utils/distro";
import SizeSetup from "./components/SizeSetup";
import ScreenTabs, { type ScreenTab } from "./components/ScreenTabs";
import ProcessorAnalysis from "./components/ProcessorAnalysis";
import ProcessorOutputs from "./components/ProcessorOutputs";
import ProcessorAllocation from "./components/ProcessorAllocation";
import ProjectDetails from "./components/ProjectDetails";
import PickList from "./components/PickList";
import { pickSections, type PickSettings } from "./utils/pickList";
import CableSchedule from "./components/CableSchedule";
import { buildCableSchedule } from "./utils/cableSchedule";
import RiggingPlanner from "./components/RiggingPlanner";
import PowerWeightPlanner from "./components/PowerWeightPlanner";
import DataPlanner from "./components/DataPlanner";
import { EmptyState, PageHeader } from "./components/ui";
import { fmtKg, setUnits, type Units } from "./utils/units";
import { canShare, makeShareUrl } from "./utils/shareLink";
import TemplatePicker from "./components/TemplatePicker";
import { templateScreens } from "./data/templates";
import ProjectToolbar from "./components/ProjectToolbar";
import { useHistory } from "./hooks/useHistory";
import {
  clearSaved,
  downloadProject,
  emptyProject,
  loadSaved,
  parseProject,
  saveLocal,
  type ProjectFile,
} from "./utils/projectFile";
import type { ReportData } from "./utils/reportPdf";
import { useInstall } from "./utils/useInstall";
import { reportChecksAll } from "./utils/checks";
import ProjectSummary from "./components/ProjectSummary";
import AppStatus from "./components/AppStatus";
import SharedBanner from "./components/SharedBanner";
import { endSharedView, getSharedView } from "./utils/sharedView";
import InstallHint from "./components/InstallHint";
import ProcessorSharing from "./components/ProcessorSharing";
import { planSharing } from "./utils/processorSharing";
import RevisionHistory from "./components/RevisionHistory";
import { compareRevisions, useRevisions, type ScreenFigures } from "./utils/revisions";
import ChecksMenu from "./components/ChecksMenu";
import CommandPalette, { type Command } from "./components/CommandPalette";

// Pick up where the person left off (read once, when the app starts).
const sharedAtStart = getSharedView();
const initial: ProjectFile = sharedAtStart ?? loadSaved() ?? emptyProject();

// Heavy pages (PDF building, the wall designer, the test pattern) load on demand.
const EngineeringReport = lazy(() => import("./components/EngineeringReport"));
const WallDesigner = lazy(() => import("./components/WallDesigner"));
const CanvasPage = lazy(() => import("./components/CanvasPage"));

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState<PageId>(() =>
    pageFromHash(window.location.hash)
  );

  const [screenTab, setScreenTab] = useState<ScreenTab>("panel");
  const [units, setUnitsState] = useState<Units>(initial.units);
  // Set before anything below formats a length or weight.
  setUnits(units);

  const [customPanels, setCustomPanelsState] = useState<LedPanel[]>(initial.customPanels);
  // Set before any plan is worked out, so the screens can find their cabinets.
  setCustomPanels(customPanels);
  const allPanels = useMemo(() => [...customPanels, ...ledPanels], [customPanels]);
  const manufacturers = useMemo(() => [...new Set(allPanels.map((p) => p.manufacturer))], [allPanels]);
  const panelCounts = useMemo(
    () =>
      allPanels.reduce<Record<string, number>>((acc, p) => {
        acc[p.manufacturer] = (acc[p.manufacturer] ?? 0) + 1;
        return acc;
      }, {}),
    [allPanels]
  );

  const [distro, setDistro] = useState<DistroSettings>(initial.distro ?? defaultDistro);
  const [pickSettings, setPickSettings] = useState<PickSettings>(initial.pickSettings);
  const [picked, setPicked] = useState<Record<string, boolean>>(initial.picked);

  const [projectName, setProjectName] = useState(initial.project.name);
  const [client, setClient] = useState(initial.project.client);
  const [venue, setVenue] = useState(initial.project.venue);
  const [engineer, setEngineer] = useState(initial.project.engineer);
  const [revision, setRevision] = useState(initial.project.revision);
  const [notes, setNotes] = useState(initial.project.notes);

  // Every screen in the project keeps its own panel, processor, size and plans.
  const history = useHistory<ScreenState[]>(initial.screens);
  const screens = history.value;
  const setScreens = history.set;
  const [activeId, setActiveId] = useState(initial.activeId);
  const nextNumber = useRef(initial.screens.length + 1);
  const st = screens.find((x) => x.id === activeId) ?? screens[0];

  const setter =
    <K extends keyof ScreenState>(key: K) =>
    (value: ScreenState[K] | ((prev: ScreenState[K]) => ScreenState[K])) =>
      setScreens((list) =>
        list.map((x) =>
          x.id === st.id
            ? {
                ...x,
                [key]:
                  typeof value === "function"
                    ? (value as (prev: ScreenState[K]) => ScreenState[K])(x[key])
                    : value,
              }
            : x
        )
      );

  const {
    manufacturer,
    model,
    processor,
    distribution,
    unitsPerLink,
    wide,
    high,
    dataSettings,
    numberingMode,
    redundancy,
    backupSame,
    customChains,
    powerSettings,
    customCircuits,
    canvasTitle,
    toggles,
    curve,
  } = st;
  const setManufacturer = setter("manufacturer");
  const setModel = setter("model");
  const setProcessor = setter("processor");
  const setDistribution = setter("distribution");
  const setUnitsPerLink = setter("unitsPerLink");
  const setWide = setter("wide");
  const setHigh = setter("high");
  const setDataSettings = setter("dataSettings");
  const setNumberingMode = setter("numberingMode");
  const setRedundancy = setter("redundancy");
  const setBackupSame = setter("backupSame");
  const setRemovedKeys = setter("removedKeys");
  const setCustomChains = setter("customChains");
  const setPowerSettings = setter("powerSettings");
  const setCustomCircuits = setter("customCircuits");
  const setCanvasTitle = setter("canvasTitle");
  const setToggles = setter("toggles");
  const setCurve = setter("curve");
  const setRowScale = setter("rowScale");
  const setContent = setter("content");
  const setColScale = setter("colScale");

  const addScreen = (copyOf?: ScreenState) => {
    const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const name = copyOf ? `${copyOf.name} copy` : `Screen ${nextNumber.current}`;
    nextNumber.current += 1;
    const fresh = copyOf ? { ...copyOf, id, name } : newScreenState(id, name);
    setScreens((list) => [...list, fresh]);
    setActiveId(id);
    setScreenTab("panel");
  };
  const removeScreen = (id: string) => {
    if (screens.length < 2) return;
    const rest = screens.filter((x) => x.id !== id);
    setScreens(rest);
    if (id === activeId) setActiveId(rest[0].id);
  };
  const renameScreen = (id: string, name: string) =>
    setScreens((list) => list.map((x) => (x.id === id ? { ...x, name } : x)));

  // --- saving, opening and undo -------------------------------------------
  const snapshot = (): ProjectFile => ({
    ...emptyProject(),
    project: { name: projectName, client, venue, engineer, revision, notes },
    units,
    screens,
    activeId: st.id,
    pickSettings,
    picked,
    customPanels,
    distro,
  });

  const [saveStatus, setSaveStatus] = useState("");
  const [viewing, setViewing] = useState(sharedAtStart !== null);
  // After opening a file or starting fresh, the next autosave becomes the "nothing unsaved" baseline.
  const rebase = useRef(false);
  // Has a project file been saved since the last change? (separate from the browser autosave)
  const blankPrint = useMemo(() => fingerprint(emptyProject()), []);
  const [backup, setBackup] = useState(loadRecord);
  const [now, setNow] = useState(() => Date.now());
  const [snoozedAt, setSnoozedAt] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const backupInfo = backupState(backup, now);
  const saveFile = () => {
    const snap = snapshot();
    downloadProject(snap);
    const rec = recordSave(fingerprint(snap), Date.now());
    storeRecord(rec);
    setBackup(rec);
    setSnoozedAt(0);
  };
  // Warn before the tab closes with changes no file has.
  useEffect(() => {
    if (!backupInfo.unsaved || viewing) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [backupInfo.unsaved, viewing]);
  useEffect(() => {
    // A shared project is only kept if the person chooses to keep it.
    if (viewing) return;
    // Keep a copy in the browser a moment after each change.
    const timer = setTimeout(() => {
      const snap = snapshot();
      const ok = saveLocal(snap);
      setBackup((rec) => {
        const print = fingerprint(snap);
        const next = rebase.current ? recordSave(print, Date.now()) : trackChange(rec, print, blankPrint, Date.now());
        rebase.current = false;
        if (next !== rec) storeRecord(next);
        return next;
      });
      setSaveStatus(
        ok
          ? `Autosaved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Couldn't autosave in this browser. Use Save file."
      );
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing, screens, activeId, projectName, client, venue, engineer, revision, notes, pickSettings, picked, units, customPanels, distro]);

  const load = (file: ProjectFile) => {
    setUnitsState(file.units);
    history.reset(file.screens);
    setActiveId(file.activeId);
    nextNumber.current = file.screens.length + 1;
    setProjectName(file.project.name);
    setClient(file.project.client);
    setVenue(file.project.venue);
    setEngineer(file.project.engineer);
    setRevision(file.project.revision);
    setNotes(file.project.notes);
    setPickSettings(file.pickSettings);
    setPicked(file.picked);
    setCustomPanelsState(file.customPanels);
    setDistro(file.distro);
    setScreenTab("panel");
  };
  const newProject = () => {
    if (!window.confirm("Start a new project? Save a file first if you want to keep this one.")) return;
    clearSaved();
    rebase.current = true;
    load(emptyProject());
  };
  const openFile = (file: File) =>
    file
      .text()
      .then((text) => {
        const parsed = parseProject(text);
        if (!parsed) {
          window.alert("That file isn't a PixelPlan project.");
          return;
        }
        rebase.current = true;
        load(parsed);
      })
      .catch(() => window.alert("That file couldn't be read."));

  // The installed desktop app can be opened by double-clicking a project file.
  useEffect(() => {
    const lq = (window as unknown as {
      launchQueue?: { setConsumer: (f: (p: { files: { getFile: () => Promise<File> }[] }) => void) => void };
    }).launchQueue;
    lq?.setConsumer(async (params) => {
      const handle = params.files?.[0];
      if (!handle) return;
      const file = await handle.getFile();
      if (window.confirm(`Open ${file.name}? It replaces the project in the app, so save a file first if you want to keep that one.`)) {
        void openFile(file);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { undo, redo } = history;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // Let text boxes keep their own undo.
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Keep the page in the address bar so refresh and back/forward work.
  useEffect(() => {
    const onHash = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const goTo = (id: PageId) => {
    window.location.hash = `/${id}`;
    setPage(id);
    window.scrollTo({ top: 0 });
  };

  const models = useMemo(
    () => (manufacturer ? allPanels.filter((p) => p.manufacturer === manufacturer) : allPanels),
    [manufacturer, allPanels]
  );

  const ctx = {
    projectName,
    client,
    venue,
    engineer,
    revision,
    notes,
    pickSettings,
    multi: screens.length > 1,
  };
  // Plans are cached per screen, so only the screen being edited is recalculated.
  const all = screens.map((x) => getCore(x, revision));
  const c = all[Math.max(0, screens.findIndex((x) => x.id === st.id))];
  const {
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
    curvePlan,
    scale,
  } = c;

  const distroPlan = useMemo(() => {
    if (page !== "distro" && page !== "report" && page !== "picklist") return null;
    const circuits: DistroCircuit[] = [];
    let three = false;
    screens.forEach((x, i) => {
      const plan = all[i].powerPlan;
      if (!plan) return;
      if (x.powerSettings.supply === "three") three = true;
      plan.circuits.forEach((cc) =>
        circuits.push({
          screen: screens.length > 1 ? x.name : "",
          number: cc.number,
          cabinets: cc.cabinets,
          watts: cc.watts,
          amps: cc.amps,
          voltage: x.powerSettings.voltage,
          breakerAmps: x.powerSettings.breakerAmps,
        })
      );
    });
    return calcDistro(circuits, three, distro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, screens, revision, distro]);

  // The pick list and report cover every screen, but only the pages that
  // show them pay for building them.
  const cableRows = useMemo(
    () => (page === "cables" || page === "report" ? buildCableSchedule(screens, all, pickSettings) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, screens, revision, pickSettings, units]
  );
  const needsPickList = page === "picklist" || page === "report";
  const pickLists = useMemo(
    () => (needsPickList ? all.map((core, i) => buildScreenPick(screens[i], core, pickSettings)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needsPickList, screens, revision, pickSettings, units]
  );
  const pickItems = useMemo(() => {
    const rank = (section: string) => {
      const i = (pickSections as readonly string[]).indexOf(section);
      return i === -1 ? pickSections.length : i;
    };
    const spare = (n: number) => Math.ceil((n * Math.max(0, pickSettings.cableSparePct)) / 100 - 1e-9);
    const extra: PickItem[] = distroPlan
      ? [
          {
            section: "Power",
            name: `Power distro, ${distro.ways} way`,
            need: distroPlan.units.length,
            spare: 0,
            total: distroPlan.units.length,
            note: distroPlan.three ? "Three phase in" : "Single phase in",
            key: "Power|distro box",
          },
          ...(distro.mainsLengthM > 0
            ? [
                {
                  section: "Power",
                  name: `Supply cable to distro, ${distro.mainsLengthM} m, ${distro.mainsMm2} mm²`,
                  need: distroPlan.units.length,
                  spare: spare(distroPlan.units.length),
                  total: distroPlan.units.length + spare(distroPlan.units.length),
                  note: `${Math.max(...distroPlan.units.map((u) => u.supplyAmps))} A feed`,
                  key: "Power|mains feed",
                },
              ]
            : []),
        ]
      : [];
    const merged = mergePickLists(pickLists);
    if (pickSettings.cabinetsPerCase > 0) {
      const cabinetTotal = merged.filter((i) => i.section === "LED").reduce((a, i) => a + i.total, 0);
      const cases = Math.ceil(cabinetTotal / pickSettings.cabinetsPerCase);
      if (cases > 0) {
        const cabKg = all.reduce((a, core) => a + core.totalWeight, 0);
        const packed = cabKg + cases * pickSettings.caseKg;
        extra.push({
          section: "Rigging",
          name: `Cabinet road case, ${pickSettings.cabinetsPerCase} cabinets`,
          need: cases,
          spare: 0,
          total: cases,
          note: pickSettings.caseKg > 0 ? `About ${fmtKg(packed)} packed, cabinets and cases` : "Includes the spare cabinets",
          key: "Rigging|road case",
        });
      }
    }
    return [...merged, ...extra]
      .map((item, index) => ({ item, index }))
      .sort((a, b) => rank(a.item.section) - rank(b.item.section) || a.index - b.index)
      .map((x) => x.item);
  }, [pickLists, distroPlan, distro, pickSettings.cableSparePct, pickSettings.cabinetsPerCase, pickSettings.caseKg]);

  const screenReady = !!selectedPanel && !!selectedProcessor;
  const done = {
    project: projectName.trim() !== "",
    screen: screenReady,
  };

  const current = pages.find((p) => p.id === page) ?? pages[0];
  const nextPage = pages[pages.findIndex((p) => p.id === page) + 1];
  const prevPage = pages[pages.findIndex((p) => p.id === page) - 1];

  const needsPanel = (content: React.ReactNode) =>
    selectedPanel ? (
      content
    ) : (
      <EmptyState
        title="Choose a panel first"
        body="The data and power plans are built from the panel and the size of the wall."
        actionLabel="Go to Screen"
        onAction={() => goTo("screen")}
      />
    );

  const figures: ScreenFigures[] = screens.map((x, i) => ({
    id: x.id,
    name: x.name,
    panel: all[i].selectedPanel ? `${all[i].selectedPanel!.manufacturer} ${all[i].selectedPanel!.model}` : "",
    processor: x.processor,
    cabinets: all[i].cabinetCount,
    resWidth: all[i].resWidth,
    resHeight: all[i].resHeight,
    widthMetres: all[i].widthMetres,
    heightMetres: all[i].heightMetres,
    ports: all[i].dataPlan ? all[i].dataPlan.ports.length : 0,
    circuits: all[i].powerPlan ? all[i].powerPlan.circuits.length : 0,
    watts: all[i].totalPower,
    kg: all[i].totalWeight,
    loadPct: Number(all[i].processorLoading) || 0,
  }));

  const sharing = planSharing(
    screens.map((x, i) => {
      const k = all[i];
      return {
        id: x.id,
        name: x.name,
        processor: x.processor,
        key: `${x.processor}|${x.distribution}|${k.effMaxPixels}|${k.availablePorts}`,
        pixels: k.totalPixels,
        ports: k.portsRequired,
        maxPixels: k.effMaxPixels,
        maxPorts: k.availablePorts,
        now: k.processorsRequired,
        copies: x.redundancy === "backup" && !x.backupSame ? 2 : 1,
      };
    })
  );

  const savedRevisions = useRevisions();
  const lastSaved = savedRevisions[0];
  const changeList = lastSaved ? compareRevisions(lastSaved.screens, figures) : [];
  const changesKey = lastSaved ? `${lastSaved.id}|${JSON.stringify(changeList)}` : "";

  const reportData = useMemo<ReportData | null>(() => {
    if (page !== "report") return null;
    const list = screens.map((x, i) => buildScreenReport(x, all[i], ctx, pickLists[i]));
    return { ...list[0], pickList: pickItems, cables: cableRows, pricing: { currency: pickSettings.currency, days: pickSettings.days }, extraScreens: list.slice(1), distro: distroPlan ? { plan: distroPlan, settings: distro } : null, changes: lastSaved ? { since: lastSaved.label, items: changeList } : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, screens, revision, projectName, client, venue, engineer, notes, pickLists, pickItems, units, cableRows, pickSettings.currency, pickSettings.days, distroPlan, distro, changesKey]);

  const install = useInstall();

  const checks = useMemo(() => {
    const list = screens.map((x, i) => buildScreenReport(x, all[i], ctx, pickLists[i]));
    return reportChecksAll({ ...list[0], pickList: pickItems, extraScreens: list.slice(1), distro: distroPlan ? { plan: distroPlan, settings: distro } : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screens, revision, pickLists, pickItems, distroPlan, distro, units]);

  const issues = useMemo(() => {
    const out: Partial<Record<PageId, "warn" | "error">> = {};
    const bump = (id: PageId, level: "warn" | "error") => {
      if (out[id] !== "error") out[id] = level;
    };
    all.forEach((core) => {
      if (!core.selectedPanel) return;
      if (core.overloaded || core.dataPlan.unassigned > 0 || core.dataPlan.ports.some((p) => p.over)) bump("data", "error");
      const pp = core.powerPlan;
      if (pp) {
        if (!pp.fits || pp.overloadedCircuits > 0 || pp.unassigned > 0) bump("power", "error");
        if (pp.rigWarnings.length) bump("rigging", "warn");
      }
    });
    if (distroPlan && distroPlan.warnings?.length) bump("distro", "warn");
    return out;
  }, [all, distroPlan]);

  const commands = useMemo<Command[]>(
    () => [
      ...pages.map((pg, i) => ({
        id: `go-${pg.id}`,
        label: pg.title,
        group: "Go to",
        hint: i < 9 ? `Alt ${i + 1}` : undefined,
        run: () => goTo(pg.id),
      })),
      { id: "undo", label: "Undo", group: "Action", hint: "Ctrl Z", run: undo },
      { id: "redo", label: "Redo", group: "Action", hint: "Ctrl Shift Z", run: redo },
      { id: "add-screen", label: "Add a screen", group: "Action", run: () => addScreen() },
      { id: "dup-screen", label: "Duplicate this screen", group: "Action", run: () => addScreen(st) },
      { id: "save", label: "Save project file", group: "Action", run: () => saveFile() },
      ...(install ? [{ id: "install", label: "Install the app", group: "Action", run: install }] : []),
      { id: "units-m", label: "Show metric units", group: "Action", run: () => setUnitsState("metric") },
      { id: "units-i", label: "Show imperial units", group: "Action", run: () => setUnitsState("imperial") },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screens, st, units, install]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.code.replace("Digit", ""));
      if (n >= 1 && n <= 9 && pages[n - 1]) {
        e.preventDefault();
        goTo(pages[n - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const sharedScreens = useMemo<SharedScreen[] | undefined>(() => {
    if (page !== "canvas" || screens.length < 2) return undefined;
    return screens.flatMap((x, i) => {
      const core = all[i];
      if (!core.canvasPlan) return [];
      return [
        {
          id: x.id,
          name: x.name,
          pos: x.canvasPos,
          pattern: {
            canvas: core.canvasPlan,
            portOf: (r: number, k: number) => core.dataPlan.map[r]?.[k]?.port ?? 0,
            labelOf: (r: number, k: number) => getCabinetLabel(r, k, x.wide, x.numberingMode),
            title: x.canvasTitle.trim() || defaultCanvasTitle(x, ctx),
            subtitle: `${core.canvasPlan.width} x ${core.canvasPlan.height} px`,
            stats: core.canvasStats,
            showPorts: x.toggles.ports,
            showLabels: x.toggles.labels,
            show: x.toggles,
          },
        },
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, screens, revision, projectName, units]);

  let body: React.ReactNode;

  switch (page) {
    case "project":
      body = (
        <div className="max-w-4xl space-y-4">
        <InstallHint />
        <TemplatePicker
          onPick={(t) => {
            if (!window.confirm(`Replace this project's screens with "${t.name}"?`)) return;
            const made = templateScreens(t);
            setScreens(made);
            setActiveId(made[0].id);
            nextNumber.current = made.length + 1;
          }}
        />
        <ProjectDetails
          projectName={projectName}
          setProjectName={setProjectName}
          client={client}
          setClient={setClient}
          venue={venue}
          setVenue={setVenue}
          engineer={engineer}
          setEngineer={setEngineer}
          revision={revision}
          setRevision={setRevision}
          notes={notes}
          setNotes={setNotes}
        />
        <RevisionHistory revision={revision} figures={figures}>
          <ProjectSummary
            embedded
            rows={screens.map((x, i) => ({
              id: x.id,
              name: x.name,
              panel: all[i].selectedPanel ? `${all[i].selectedPanel!.manufacturer} ${all[i].selectedPanel!.model}` : "",
              cabinets: all[i].cabinetCount,
              resWidth: all[i].resWidth,
              resHeight: all[i].resHeight,
              widthMetres: all[i].widthMetres,
              heightMetres: all[i].heightMetres,
              watts: all[i].totalPower,
              kg: all[i].totalWeight,
              processor: x.processor,
              processors: all[i].processorsRequired,
              overloaded: all[i].overloaded,
            }))}
            checks={checks}
            onOpen={(id) => {
              setActiveId(id);
              goTo("screen");
            }}
          />
        </RevisionHistory>
        <ProcessorSharing plan={sharing} />
        </div>
      );
      break;

    case "screen":
      body = (
        <div className="space-y-4">
          <ScreenTabs
            value={screenTab}
            onChange={setScreenTab}
            done={{
              panel: !!selectedPanel,
              processor: !!selectedProcessor,
              size: wide > 0 && high > 0,
            }}
            summary={{
              panel: selectedPanel
                ? `${selectedPanel.manufacturer} ${selectedPanel.model}`
                : "Choose a panel",
              processor: selectedProcessor
                ? `${selectedProcessor.model}${selectedUnit ? ` + ${selectedUnit.model}` : ""}`
                : "Choose a processor",
              size: `${wide} × ${high} cabinets`,
            }}
          />

          {screenTab === "panel" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <PanelPicker
                manufacturer={manufacturer}
                setManufacturer={(m) => {
                  setManufacturer(m);
                  if (m && selectedPanel && selectedPanel.manufacturer !== m) setModel("");
                }}
                model={model}
                setModel={setModel}
                manufacturers={manufacturers}
                models={models}
                counts={panelCounts}
                total={allPanels.length}
              />
              <div className="space-y-4">
                <PanelInfo panel={selectedPanel} />
                <CustomPanels
                  list={customPanels}
                  setList={setCustomPanelsState}
                  onAdded={(m) => {
                    setManufacturer("");
                    setModel(m);
                  }}
                  onRemoved={(m) =>
                    setScreens((list) => list.map((x) => (x.model === m ? { ...x, model: "" } : x)))
                  }
                />
              </div>
            </div>
          )}

          {screenTab === "processor" && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <ProcessorPicker
                  processors={processors}
                  processor={processor}
                  setProcessor={setProcessor}
                  units={distributionUnits}
                  distribution={distribution}
                  setDistribution={setDistribution}
                  unitsPerLink={unitsPerLink}
                  setUnitsPerLink={setUnitsPerLink}
                />
                <ProcessorInfo processor={selectedProcessor} unit={selectedUnit} />
              </div>
              <ContentSettings
                content={st.content}
                setContent={setContent}
                processor={selectedProcessor}
                factor={c.capacityFactor}
                effMaxPixels={c.effMaxPixels}
                effPixelsPerPort={c.effPixelsPerPort}
              />
              <ProcessorOutputs
                processorName={processor}
                totalPorts={availablePorts}
                ports={dataPlan.ports}
                redundancy={redundancy}
                backupSame={backupSame}
              />
              {processorsRequired > 1 && (
                <ProcessorAllocation
                  processorsRequired={processorsRequired}
                  portsRequired={portsRequired}
                />
              )}
            </>
          )}

          {screenTab === "size" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4">
                <MixedSizes
                  wide={wide}
                  high={high}
                  rowScale={st.rowScale}
                  colScale={st.colScale}
                  setRowScale={setRowScale}
                  setColScale={setColScale}
                  panelChosen={!!selectedPanel}
                  sizes={c.cabinetSizes}
                />
                <SizeSetup
                  wide={wide}
                  setWide={setWide}
                  high={high}
                  setHigh={setHigh}
                  widthMetres={widthMetres}
                  heightMetres={heightMetres}
                  panelChosen={!!selectedPanel}
                />
                <TargetSize
                  panelWidth={selectedPanel?.width ?? 0}
                  panelHeight={selectedPanel?.height ?? 0}
                  resWidth={resWidth}
                  resHeight={resHeight}
                  panelChosen={!!selectedPanel}
                  apply={(o) =>
                    setScreens((list) =>
                      list.map((x) =>
                        x.id === st.id
                          ? {
                              ...x,
                              wide: o.wide,
                              high: o.high,
                              colScale: o.halfCol ? Array.from({ length: o.wide }, (_, i) => (i === o.wide - 1 ? 0.5 : 1)) : [],
                              rowScale: o.halfRow ? Array.from({ length: o.high }, (_, i) => (i === o.high - 1 ? 0.5 : 1)) : [],
                              removedKeys: [],
                              customChains: null,
                              customCircuits: null,
                            }
                          : x
                      )
                    )
                  }
                />
                <CurveSetup curve={curve} setCurve={setCurve} plan={curvePlan} panelChosen={!!selectedPanel} />
                <ViewingDistance plan={selectedPanel ? calcViewing(selectedPanel.pitch, heightMetres) : null} />
              </div>
              <div className="lg:col-span-2">
                <ProcessorAnalysis
                  widthMetres={widthMetres}
                  heightMetres={heightMetres}
                  resWidth={resWidth}
                  resHeight={resHeight}
                  totalPixels={totalPixels}
                  totalWeight={totalWeight}
                  totalPower={totalPower}
                  processorLoading={processorLoading}
                  portsRequired={portsRequired}
                  availablePorts={availablePorts}
                  overloaded={overloaded}
                  processorsRequired={processorsRequired}
                  distributionUnits={distributionPlan?.units ?? 0}
                  distributionLinks={distributionPlan?.links ?? 0}
                  distributionName={selectedUnit ? selectedUnit.model : ""}
                  distributionWarnings={distributionWarnings}
                />
              </div>
            </div>
          )}
        </div>
      );
      break;

    case "data":
      body = needsPanel(
        <DataPlanner
          plan={dataPlan}
          wide={wide}
          settings={dataSettings}
          setSettings={setDataSettings}
          numberingMode={numberingMode}
          setNumberingMode={setNumberingMode}
          redundancy={redundancy}
          setRedundancy={setRedundancy}
          backupSame={backupSame}
          setBackupSame={setBackupSame}
          customChains={customChains}
          setCustomChains={setCustomChains}
          processorName={processor}
          processorPorts={availablePorts}
          scale={scale}
        />
      );
      break;

    case "canvas":
      body = needsPanel(
        canvasPlan ? (
          <CanvasPage
            canvas={canvasPlan}
            dataPlan={dataPlan}
            redundancy={redundancy}
            numberingMode={numberingMode}
            title={canvasTitle}
            setTitle={setCanvasTitle}
            fallbackTitle={defaultCanvasTitle(st, ctx)}
            stats={canvasStats}
            toggles={toggles}
            setToggles={setToggles}
            shared={sharedScreens}
            setPos={(id, pos) => setScreens((list) => list.map((x) => (x.id === id ? { ...x, canvasPos: pos } : x)))}
            projectName={projectName}
          />
        ) : null
      );
      break;

    case "power":
      body = needsPanel(
        <PowerWeightPlanner
          plan={powerPlan}
          settings={powerSettings}
          setSettings={setPowerSettings}
          customCircuits={customCircuits}
          setCustomCircuits={setCustomCircuits}
          removed={removed}
          wide={wide}
          numberingMode={numberingMode}
          scale={scale}
        />
      );
      break;

    case "distro":
      body = needsPanel(<PowerDistro plan={distroPlan} settings={distro} setSettings={setDistro} />);
      break;

    case "rigging":
      body = needsPanel(
        <RiggingPlanner plan={powerPlan} settings={powerSettings} setSettings={setPowerSettings} />
      );
      break;

    case "cables":
      body = needsPanel(<CableSchedule rows={cableRows} projectName={projectName} />);
      break;

    case "picklist":
      body = needsPanel(
        <PickList
          items={pickItems}
          settings={pickSettings}
          setSettings={setPickSettings}
          picked={picked}
          setPicked={setPicked}
          projectName={projectName}
        />
      );
      break;

    case "designer":
      body = (
        <WallDesigner
          wide={wide}
          high={high}
          removed={removed}
          setRemoved={setRemovedKeys}
          numberingMode={numberingMode}
          redundancy={redundancy}
          dataPlan={dataPlan}
          powerPlan={powerPlan}
          threePhase={powerSettings.supply === "three"}
          scale={scale}
          hasPanel={!!selectedPanel}
          projectName={projectName}
          panelName={selectedPanel ? `${selectedPanel.manufacturer} ${selectedPanel.model}` : ""}
          widthMetres={widthMetres}
          heightMetres={heightMetres}
          cabinetHeightMm={selectedPanel?.height ?? 0}
          resWidth={resWidth}
          resHeight={resHeight}
          weightKg={totalWeight}
          powerKw={totalPower / 1000}
        />
      );
      break;

    case "report":
      body = needsPanel(reportData ? <EngineeringReport data={reportData} /> : null);
      break;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <div className="hidden lg:block w-56 shrink-0 sticky top-0 h-screen self-start">
        <Sidebar current={page} onSelect={goTo} done={done} issues={issues} onInstall={install ?? undefined} />
      </div>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Pages">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close the page menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 max-w-[80vw] shadow-2xl">
            <Sidebar
              current={page}
              onSelect={(id) => {
                setMenuOpen(false);
                goTo(id);
              }}
              done={done}
              issues={issues}
              onInstall={install ?? undefined}
            />
          </div>
        </div>
      )}
      <CommandPalette commands={commands} />
      <AppStatus />

      <nav
        aria-label="Previous and next page"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            className="btn"
            disabled={!prevPage}
            onClick={() => prevPage && goTo(prevPage.id)}
            aria-label={prevPage ? `Back to ${prevPage.label}` : "No earlier page"}
          >
            ‹ {prevPage?.label ?? "Back"}
          </button>
          <button type="button" className="btn flex-1 min-w-0" onClick={() => setMenuOpen(true)} aria-label="Open the page menu">
            <span className="truncate">
              {pages.findIndex((x) => x.id === page) + 1}/{pages.length} · {current.label}
            </span>
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!nextPage}
            onClick={() => nextPage && goTo(nextPage.id)}
            aria-label={nextPage ? `On to ${nextPage.label}` : "No later page"}
          >
            {nextPage?.label ?? "Next"} ›
          </button>
        </div>
      </nav>

      <div className="flex-1 min-w-0">
        <TopBar
          projectName={projectName}
          screenName={screens.length > 1 ? st.name : ""}
          revision={revision}
          processor={processor}
          resWidth={resWidth}
          resHeight={resHeight}
          widthMetres={widthMetres}
          heightMetres={heightMetres}
          cabinets={cabinetCount}
          totalKw={totalPower / 1000}
          totalKg={totalWeight}
          loadPct={
            selectedProcessor && totalPixels
              ? (totalPixels / c.effMaxPixels) * 100
              : null
          }
          overloaded={overloaded}
          extra={<ChecksMenu checks={checks} />}
          onMenu={() => setMenuOpen(true)}
        />

        <main className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-[1400px]">
          {!viewing && backupInfo.remind && now - snoozedAt > 30 * 60 * 1000 && (
            <BackupReminder minutes={backupInfo.minutes} onSave={saveFile} onLater={() => setSnoozedAt(Date.now())} />
          )}
          {viewing && (
            <SharedBanner
              hasOwn={loadSaved() !== null}
              onKeep={() => {
                saveLocal(snapshot());
                endSharedView();
                setViewing(false);
              }}
              onLeave={() => {
                endSharedView();
                window.location.reload();
              }}
            />
          )}
          <ProjectToolbar
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={undo}
            onRedo={redo}
            onNew={newProject}
            onSave={saveFile}
            onShare={
              canShare()
                ? () =>
                    makeShareUrl(snapshot())
                      .then((url) =>
                        navigator.clipboard.writeText(url).then(() =>
                          setSaveStatus(
                            url.length > 8000
                              ? "Link copied, but it is very long. Some apps may cut it off. Use Save file to be safe."
                              : "Link copied"
                          )
                        )
                      )
                      .catch(() => setSaveStatus("Couldn't copy the link in this browser. Use Save file."))
                : undefined
            }
            onOpen={openFile}
            status={saveStatus}
            units={units}
            onUnits={setUnitsState}
          />

          {page !== "project" && page !== "report" && (
            <ScreenBar
              screens={screens.map((x, i) => ({
                id: x.id,
                name: x.name,
                warn: all[i].overloaded,
                summary: all[i].selectedPanel
                  ? `${x.wide} × ${x.high} · ${all[i].resWidth} × ${all[i].resHeight}`
                  : "No panel yet",
              }))}
              activeId={st.id}
              onSelect={setActiveId}
              onAdd={() => addScreen()}
              onDuplicate={() => addScreen(st)}
              onRemove={() => removeScreen(st.id)}
              onRename={(name) => renameScreen(st.id, name)}
            />
          )}

          <PageHeader title={current.title} description={current.description} />

          <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>{body}</Suspense>

          {nextPage && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={() => goTo(nextPage.id)}
              >
                Continue to {nextPage.label}
              </button>
            </div>
          )}
          <footer className="mt-10 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            PixelPlan gives planning estimates for LED walls. Check the figures against the manufacturer&apos;s
            data, and have rigging, ballast and electrical designs signed off by a qualified person before use.
            Your projects stay in this browser unless you save a file or copy a share link.
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
