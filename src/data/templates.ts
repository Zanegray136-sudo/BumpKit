import { newScreenState, type ScreenState } from "../utils/screenModel";
import { defaultPowerSettings } from "../utils/powerPlan";

export type Template = {
  id: string;
  name: string;
  blurb: string;
  screens: { name: string; patch: Partial<ScreenState> }[];
};

/** Starting points. Every figure can be changed afterwards. */
export const templates: Template[] = [
  {
    id: "touring",
    name: "Touring backdrop",
    blurb: "One flown wall, 12 x 6 Black Pearl 2 V2 on a NovaStar MX40 Pro.",
    screens: [
      {
        name: "Backdrop",
        patch: {
          model: "BP2V2",
          processor: "MX40 Pro",
          wide: 12,
          high: 6,
          powerSettings: { ...defaultPowerSettings, riggingPoints: 4, supply: "three" },
        },
      },
    ],
  },
  {
    id: "imag",
    name: "IMAG pair",
    blurb: "Two matching 5 x 3 Black Pearl 3 screens either side of the stage.",
    screens: [
      { name: "IMAG left", patch: { model: "BP3", processor: "MX40 Pro", wide: 5, high: 3 } },
      { name: "IMAG right", patch: { model: "BP3", processor: "MX40 Pro", wide: 5, high: 3 } },
    ],
  },
  {
    id: "stage",
    name: "Main wall and side screens",
    blurb: "A 14 x 6 centre wall with two tall 3 x 5 side screens, all on one processor type.",
    screens: [
      { name: "Main wall", patch: { model: "BP2V2", processor: "MX40 Pro", wide: 14, high: 6 } },
      { name: "Side left", patch: { model: "BP2V2", processor: "MX40 Pro", wide: 3, high: 5 } },
      { name: "Side right", patch: { model: "BP2V2", processor: "MX40 Pro", wide: 3, high: 5 } },
    ],
  },
  {
    id: "corporate",
    name: "Fine-pitch corporate wall",
    blurb: "A close-viewing 8 x 4 Ruby 1.5 wall on a Brompton Tessera SX40.",
    screens: [{ name: "Corporate wall", patch: { model: "RB1.5", processor: "Tessera SX40", wide: 8, high: 4 } }],
  },
];

/** The screens a template makes, with fresh ids. */
export function templateScreens(t: Template): ScreenState[] {
  const stamp = Date.now().toString(36);
  return t.screens.map((s, i) => ({ ...newScreenState(`s${stamp}${i}`, s.name), ...s.patch }));
}
