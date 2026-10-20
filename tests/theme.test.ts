import { describe, it, expect } from "vitest";
import { resolveTheme } from "../src/utils/theme";

describe("theme", () => {
  it("follows the device only when asked", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });
});
