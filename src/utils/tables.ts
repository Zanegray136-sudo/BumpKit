export type Row = Record<string, string>;

export type Column = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "time" | "check";
  options?: string[];
  width?: string;
  /** A read-only column worked out from the row and the rest of the table */
  calc?: (row: Row, rows: Row[]) => string;
};

export type Helper = { label: string; title?: string; run: (rows: Row[]) => Row[] };

export const emptyRow = (cols: Column[], defaults: Row = {}): Row => {
  const r: Row = { id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
  for (const c of cols) if (!c.calc) r[c.key] = defaults[c.key] ?? (c.type === "select" ? (c.options?.[0] ?? "") : "");
  return r;
};

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function tableCsv(cols: Column[], rows: Row[]): string {
  const head = cols.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) =>
    cols
      .map((c) => {
        const v = c.calc ? c.calc(r, rows) : (r[c.key] ?? "");
        return csvCell(c.type === "check" ? (v === "1" ? "Yes" : "") : v);
      })
      .join(",")
  );
  return [head, ...body].join("\n") + "\n";
}

const keyOf = (id: string) => `bumpkit.${id}`;

export function loadRows(id: string): Row[] {
  try {
    const v = JSON.parse(localStorage.getItem(keyOf(id)) ?? "null");
    if (Array.isArray(v)) return v.filter((r) => r && typeof r === "object" && typeof r.id === "string").map((r) => Object.fromEntries(Object.entries(r).map(([k, x]) => [k, String(x ?? "")])));
  } catch {
    /* start empty */
  }
  return [];
}

export function saveRows(id: string, rows: Row[]) {
  try {
    localStorage.setItem(keyOf(id), JSON.stringify(rows));
  } catch {
    /* not saved */
  }
}

const n = (s: string | undefined, d = 0) => {
  const v = Number(s);
  return Number.isFinite(v) && s !== "" && s !== undefined ? v : d;
};

/**
 * Gives every lighting row a start universe and address. Fixtures in a row sit side by side. A fixture is never
 * split across two universes, so the next one moves to the start of the next universe when it would not fit.
 */
export function autoAddress(rows: Row[], universeSize = 512): Row[] {
  let u = 1;
  let a = 1;
  return rows.map((r) => {
    const ch = Math.max(1, Math.min(universeSize, Math.round(n(r.channels, 1))));
    const qty = Math.max(1, Math.round(n(r.qty, 1)));
    if (a + ch - 1 > universeSize) {
      u++;
      a = 1;
    }
    const out = { ...r, universe: String(u), address: String(a) };
    for (let i = 0; i < qty; i++) {
      if (a + ch - 1 > universeSize) {
        u++;
        a = 1;
      }
      a += ch;
    }
    return out;
  });
}

/** Where the last fixture of a lighting row ends, as universe.address. */
export function lightEnds(r: Row, universeSize = 512): string {
  const ch = Math.max(1, Math.min(universeSize, Math.round(n(r.channels, 1))));
  const qty = Math.max(1, Math.round(n(r.qty, 1)));
  let u = Math.round(n(r.universe, 0));
  let a = Math.round(n(r.address, 0));
  if (u < 1 || a < 1) return "";
  let endU = u;
  let endA = a;
  for (let i = 0; i < qty; i++) {
    if (a + ch - 1 > universeSize) {
      u++;
      a = 1;
    }
    endU = u;
    endA = a + ch - 1;
    a += ch;
  }
  return `${endU}.${endA}`;
}

/** Renumbers a column 1, 2, 3... in the order the rows are in. */
export const renumber = (rows: Row[], key: string): Row[] => rows.map((r, i) => ({ ...r, [key]: String(i + 1) }));

export const sortByDate = (rows: Row[]): Row[] =>
  [...rows].sort((a, b) => `${a.date || "9999"}T${a.start || "99:99"}`.localeCompare(`${b.date || "9999"}T${b.start || "99:99"}`));
