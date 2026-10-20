export type ThemeChoice = "dark" | "light" | "system";
const KEY = "pixelplan.theme";

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    /* storage blocked */
  }
  return "dark";
}

/** What the page should look like right now. */
export function resolveTheme(choice: ThemeChoice, prefersLight: boolean): "dark" | "light" {
  return choice === "system" ? (prefersLight ? "light" : "dark") : choice;
}

const prefersLight = () => {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  } catch {
    return false;
  }
};

export function applyTheme(choice: ThemeChoice) {
  const t = resolveTheme(choice, prefersLight());
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f3f5f7" : "#171b1e");
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* kept for this visit only */
  }
  applyTheme(choice);
}

/** Follow the system setting while "system" is chosen. */
export function watchSystemTheme() {
  try {
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if (readTheme() === "system") applyTheme("system");
    });
  } catch {
    /* older browsers */
  }
}
