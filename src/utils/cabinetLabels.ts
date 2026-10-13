export type Cell = {
  port: number;
  direction: string;
  /** Position along the cable on this port (1 = first cabinet) */
  seq?: number;
  /** Cut out of the wall */
  removed?: boolean;
};

export type PortRange = {
  port: number;
  first: string;
  last: string;
  count: number;
  /** Readable list such as "001 - 020" or "A01 - A10, B03 - B05" */
  cabinets: string;
};

/**
 * Turns a set of cabinet names into short runs. Names that follow on
 * from each other are joined (001, 002, 003 becomes "001 - 003").
 */
export function describeLabels(labels: string[]): string {
  if (labels.length === 0) return "-";

  const parsed = labels
    .map((label) => {
      const m = /^(\D*)(\d+)$/.exec(label);
      return m
        ? { label, prefix: m[1], n: Number(m[2]) }
        : { label, prefix: label, n: 0 };
    })
    .sort((a, b) => (a.prefix === b.prefix ? a.n - b.n : a.prefix < b.prefix ? -1 : 1));

  const runs: string[] = [];
  let start = parsed[0];
  let prev = parsed[0];

  const close = () =>
    runs.push(start.label === prev.label ? start.label : `${start.label} - ${prev.label}`);

  for (let i = 1; i < parsed.length; i++) {
    const cur = parsed[i];
    if (cur.prefix === prev.prefix && cur.n === prev.n + 1) {
      prev = cur;
    } else {
      close();
      start = cur;
      prev = cur;
    }
  }
  close();

  return runs.length <= 4
    ? runs.join(", ")
    : `${parsed[0].label} - ${parsed[parsed.length - 1].label} (${runs.length} runs)`;
}

/**
 * Single source of truth for cabinet naming, shared by the routing map,
 * the patch sheet and the PDF report so they can never disagree.
 */
export function getCabinetLabel(
  rowIndex: number,
  colIndex: number,
  rowLength: number,
  numberingMode: string
): string {
  if (numberingMode === "venue") {
    const rowLetter = String.fromCharCode(65 + rowIndex);
    return rowLetter + String(colIndex + 1).padStart(2, "0");
  }

  let cabinetNumber = rowIndex * rowLength + colIndex + 1;

  if (numberingMode === "snake" && rowIndex % 2 === 1) {
    cabinetNumber = rowIndex * rowLength + (rowLength - colIndex);
  }

  return String(cabinetNumber).padStart(3, "0");
}

/**
 * First and last cabinet on every port, in the same labelling the
 * routing map uses. "First" and "last" follow the data cable.
 */
export function getPortRanges(
  snakeMap: Cell[][],
  numberingMode: string
): PortRange[] {
  const rowLength = snakeMap[0]?.length ?? 0;
  const found = new Map<
    number,
    {
      first: string;
      last: string;
      lo: number;
      hi: number;
      count: number;
      labels: string[];
    }
  >();

  snakeMap.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell.port === 0) return;

      const label = getCabinetLabel(
        rowIndex,
        colIndex,
        rowLength,
        numberingMode
      );
      const seq = cell.seq ?? rowIndex * rowLength + colIndex + 1;
      const entry = found.get(cell.port);

      if (!entry) {
        found.set(cell.port, {
          first: label,
          last: label,
          lo: seq,
          hi: seq,
          count: 1,
          labels: [label],
        });
        return;
      }

      entry.count += 1;
      entry.labels.push(label);
      if (seq < entry.lo) {
        entry.lo = seq;
        entry.first = label;
      }
      if (seq > entry.hi) {
        entry.hi = seq;
        entry.last = label;
      }
    });
  });

  return [...found.entries()]
    .map(([port, e]) => ({
      port,
      first: e.first,
      last: e.last,
      count: e.count,
      cabinets: describeLabels(e.labels),
    }))
    .sort((a, b) => a.port - b.port);
}
