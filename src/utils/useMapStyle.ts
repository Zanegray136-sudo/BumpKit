import { useState } from "react";

const KEY = "open-av-toolkit.map-style";
export type MapStyle = "card" | "solid";

/** Cards or solid tiles, remembered in this browser and shared by the data and power maps. */
export function useMapStyle(): [MapStyle, (v: MapStyle) => void] {
  const [style, setStyle] = useState<MapStyle>(() => {
    try {
      return localStorage.getItem(KEY) === "solid" ? "solid" : "card";
    } catch {
      return "card";
    }
  });
  const set = (v: MapStyle) => {
    setStyle(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* not saved */
    }
  };
  return [style, set];
}
