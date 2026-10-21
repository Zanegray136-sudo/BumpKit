import { describe, it, expect } from "vitest";
import { clientSummary } from "../src/utils/clientSummary";
import type { ReportData } from "../src/utils/reportPdf";

const screen = (cabinets: number, kw: number, kg: number) => ({
  panelName: "X", pitch: 2.6, cabinetWidth: 500, cabinetHeight: 500, wide: 4, high: 3, cabinets, cutOut: 0,
  widthMetres: 4, heightMetres: 3, resWidth: 768, resHeight: 576, totalPixels: 1, weightKg: kg, maxPowerKw: kw,
});
const mk = (name: string, s: ReturnType<typeof screen>, extra: ReportData[] = []) =>
  ({ screenName: name, screen: s, processor: { name: "VX600", processorsRequired: 2 }, extraScreens: extra, project: {} }) as unknown as ReportData;

describe("client summary", () => {
  it("totals every screen with cabinets and skips empty ones", () => {
    const d = mk("Main", screen(12, 2.4, 100), [mk("Side", screen(6, 1.2, 50)), mk("Empty", screen(0, 0, 0))]);
    const c = clientSummary(d);
    expect(c.rows.length).toBe(2);
    expect(c.totals).toEqual({ screens: 2, cabinets: 18, kw: 3.5999999999999996, kg: 150 });
    expect(c.rows[0].processor).toBe("2 x VX600");
    expect(c.rows[0].power).toBe("2.4 kW");
  });
});

import { clientPrice } from "../src/utils/clientSummary";
describe("client price", () => {
  it("is null with no prices and totals priced items for the hire days", () => {
    expect(clientPrice({ pickList: [{ key: "a", name: "A", total: 2, need: 2, spare: 0, note: "" }], pricing: { currency: "$", days: 3 } } as unknown as ReportData)).toBeNull();
    const item = { key: "a", name: "A", total: 2, need: 2, spare: 0, note: "", unitPrice: 10 };
    const p = clientPrice({ pickList: [item], pricing: { currency: "A$", days: 1 } } as unknown as ReportData);
    expect(p?.currency).toBe("A$");
    expect(p?.total).toBe(20);
  });
});
