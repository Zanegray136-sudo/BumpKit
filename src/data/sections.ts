export type PageId =
  | "project"
  | "screen"
  | "data"
  | "canvas"
  | "power"
  | "distro"
  | "rigging"
  | "cables"
  | "picklist"
  | "exports"
  | "report";

export type Page = {
  id: PageId;
  label: string;
  title: string;
  description: string;
};

/** In the order a tech would work through a job. */
export const pages: Page[] = [
  {
    id: "project",
    label: "Project",
    title: "Project",
    description: "Name the job so it appears on the top bar and the report.",
  },
  {
    id: "screen",
    label: "Screen",
    title: "Screen",
    description:
      "Choose the panel, the size of the wall and the processor. Everything else is worked out from this.",
  },
  {
    id: "data",
    label: "Data",
    title: "Data map",
    description:
      "A suggested data map is made for you. Pick a port and drag cabinets onto it to change it.",
  },
  {
    id: "canvas",
    label: "Canvas",
    title: "Pixel canvas",
    description:
      "The pixel canvas for your media server: the wall's resolution, with the area of every data port.",
  },
  {
    id: "power",
    label: "Power",
    title: "Power",
    description:
      "A suggested power map is made for you. Pick a circuit and drag cabinets onto it to change it.",
  },
  {
    id: "distro",
    label: "Distro",
    title: "Power distro",
    description:
      "Which distro and phase each circuit goes on, the supply each distro needs, the generator size and the voltage drop.",
  },
  {
    id: "rigging",
    label: "Rigging",
    title: "Rigging",
    description:
      "Weight, rigging points and the working load each point needs, or the stack limit for a ground-stacked wall.",
  },
  {
    id: "cables",
    label: "Cables",
    title: "Cable schedule",
    description:
      "Every cable run with an ID, where it goes and how long it is. Download the list or a sheet of labels.",
  },
  {
    id: "picklist",
    label: "Pick list",
    title: "Pick list",
    description:
      "Everything to pack for the wall, worked out from your data and power plans. Tick items off as you pick them.",
  },
  {
    id: "exports",
    label: "Exports",
    title: "Media server / Processor exports",
    description:
      "Files for your media server and LED processor: a screen mesh, a Pixera pixel map and NovaStar VMP layouts.",
  },
  {
    id: "report",
    label: "Report",
    title: "Report",
    description: "Review the job and export the engineering report as a PDF.",
  },
];

export const pageIds = pages.map((p) => p.id);

export function pageFromHash(hash: string): PageId {
  const id = hash.replace(/^#\/?/, "");
  return (pageIds.find((p) => p === id) ?? "project") as PageId;
}
