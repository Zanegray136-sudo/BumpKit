import { useState } from "react";
import { readTheme, setTheme, type ThemeChoice } from "../utils/theme";
import { ModeSwitchGeneric } from "./ui";

export default function ThemeSetting() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  return (
    <div className="panel">
      <h2 className="panel-title">Appearance</h2>
      <ModeSwitchGeneric
        label="Theme"
        value={choice}
        onChange={(v) => {
          setChoice(v as ThemeChoice);
          setTheme(v as ThemeChoice);
        }}
        options={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "system", label: "Match device" },
        ]}
      />
      <p className="mt-2 text-xs text-zinc-400">Dark is easier in a dim venue. Light suits daylight and offices. The setting is kept on this device.</p>
    </div>
  );
}
