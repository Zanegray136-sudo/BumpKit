import { describe, it, expect } from "vitest";
import { tourSteps } from "../src/components/WelcomeCard";
import { pages } from "../src/data/sections";

describe("welcome tour", () => {
  it("only points at pages that exist", () => {
    const ids = pages.map((p) => p.id as string);
    expect(tourSteps.every((s) => ids.includes(s.page))).toBe(true);
  });
});
