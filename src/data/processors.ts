export type Processor = {
  manufacturer: string;
  model: string;
  /** Total pixel capacity of the device */
  maxPixels: number;
  ethernetPorts: number;
  fibrePorts?: number;
  /** Planning figure per Gigabit port (8-bit, 60Hz) */
  pixelsPerPort: number;
  /**
   * Native 10G outputs that can feed a distribution unit (XD, CVT10).
   * When set, the 1G ports are only reachable through those units.
   */
  tenGigOutputs?: number;
  /** Where the capacity figures came from. Unset = not checked against a spec sheet. */
  specSource?: string;
};

export const processors: Processor[] = [
  {
    manufacturer: "NovaStar",
    model: "VX600",
    maxPixels: 3900000,
    ethernetPorts: 6,
    pixelsPerPort: 650000,
    specSource: "ADJ VX600 product page (3.9M px, 6 Ethernet); per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "NovaStar",
    model: "VX1000",
    maxPixels: 6500000,
    ethernetPorts: 10,
    fibrePorts: 2,
    pixelsPerPort: 650000,
    specSource: "ADJ VX1000 product page (6.5M px, 10 Ethernet, 2 fibre outputs); per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "NovaStar",
    model: "VX4S",
    maxPixels: 2600000,
    ethernetPorts: 4,
    pixelsPerPort: 650000,
    specSource: "Elation VX4S product page (2.6M px, 4 Ethernet); per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "NovaStar",
    model: "VX16s",
    maxPixels: 10400000,
    ethernetPorts: 16,
    pixelsPerPort: 650000,
    specSource: "ADJ VX16s product page (10.4M px, 16 Ethernet); per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "NovaStar",
    model: "MX20",
    maxPixels: 3900000,
    ethernetPorts: 6,
    fibrePorts: 2,
    pixelsPerPort: 650000,
    specSource: "NovaStar MX20 listing (3.9M px, 6 Gigabit Ethernet, 2x 10G optical where OPT 2 copies OPT 1; 659,722 px per port at 8-bit 60Hz); planning figure 650K",
  },
  {
    manufacturer: "NovaStar",
    model: "MX30",
    maxPixels: 6500000,
    ethernetPorts: 10,
    fibrePorts: 2,
    pixelsPerPort: 650000,
    specSource: "NovaStar MX30 spec sheet (6.5M px, 10 Ethernet, 2x 10G optical, 659,722 px per port at 8-bit 60Hz); planning figure 650K",
  },
  {
    manufacturer: "NovaStar",
    model: "MX40 Pro",
    maxPixels: 9000000,
    ethernetPorts: 20,
    fibrePorts: 4,
    pixelsPerPort: 650000,
    specSource: "NovaStar MX40 Pro product page (9M px, 20 Ethernet, 4x 10G SFP+ copies of the Ethernet data); per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "NovaStar",
    model: "H2 (H_20xRJ45 card)",
    maxPixels: 26000000,
    ethernetPorts: 20,
    pixelsPerPort: 650000,
    specSource: "NovaStar H2 product page (26M px with the H_20xRJ45 output card); per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "NovaStar",
    model: "H2 (H_16xRJ45+2xfiber card)",
    maxPixels: 20800000,
    ethernetPorts: 16,
    fibrePorts: 2,
    pixelsPerPort: 650000,
    specSource: "NovaStar H2 product page (20.8M px with the H_16xRJ45+2xfiber output card); per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "NovaStar",
    model: "H5 (H_20xRJ45 card)",
    maxPixels: 39000000,
    ethernetPorts: 20,
    pixelsPerPort: 650000,
    specSource: "NovaStar H5 product page (39M px maximum, 20 Ethernet per H_20xRJ45 output card, up to 3 output cards); one card shown, use more processors for more ports; per-port figure is a 650K planning value, NovaStar publishes up to 659,722 at 8-bit 60Hz",
  },
  {
    manufacturer: "Brompton",
    model: "Tessera S4",
    maxPixels: 2100000,
    ethernetPorts: 4,
    fibrePorts: 0,
    pixelsPerPort: 525000,
    specSource: "Brompton S4 data sheet (4 x 1G outputs at 525K px, 8bpc 60Hz); total is 4 x 525K",
  },
  {
    manufacturer: "Brompton",
    model: "Tessera S8",
    maxPixels: 4500000,
    ethernetPorts: 8,
    fibrePorts: 0,
    pixelsPerPort: 525000,
    specSource: "Brompton S8 listing (8 x 1G outputs at 525K px, 4.5M px maximum output capacity)",
  },
  {
    manufacturer: "Brompton",
    model: "Tessera SX40",
    maxPixels: 9000000,
    ethernetPorts: 40,
    fibrePorts: 4,
    pixelsPerPort: 525000,
    tenGigOutputs: 4,
    specSource: "Brompton SX40 data sheet (9M px at 36bpp 60Hz, 4x 10G copper and 4x 10G fibre outputs; 40 x 1G ports come from XD units at 525K px each)",
  },
  {
    manufacturer: "Colorlight",
    model: "Z6",
    maxPixels: 8300000,
    ethernetPorts: 16,
    pixelsPerPort: 650000,
    specSource: "Colorlight Z6 data sheet (8.3M px, 16 Gigabit Ethernet); per-port figure is a 650K planning value, not published",
  },
  {
    manufacturer: "Colorlight",
    model: "X4s",
    maxPixels: 2600000,
    ethernetPorts: 4,
    pixelsPerPort: 650000,
    specSource: "Colorlight X4s as listed by LED Wall Central (2.6M px, 4 Gigabit Ethernet); per-port figure is a 650K planning value, not published there",
  },
  {
    manufacturer: "Colorlight",
    model: "X8",
    maxPixels: 5000000,
    ethernetPorts: 8,
    pixelsPerPort: 650000,
    specSource: "Colorlight X8 as listed by LED Wall Central (5M px, 8 Gigabit Ethernet); per-port figure is a 650K planning value, not published there",
  },
  {
    manufacturer: "Colorlight",
    model: "X16",
    maxPixels: 8800000,
    ethernetPorts: 16,
    pixelsPerPort: 650000,
    specSource: "Colorlight X16 as listed by LED Wall Central (8.8M px, 16 Gigabit Ethernet); per-port figure is a 650K planning value, not published there",
  },
  {
    manufacturer: "Colorlight",
    model: "X20",
    maxPixels: 11800000,
    ethernetPorts: 20,
    pixelsPerPort: 650000,
    specSource: "Colorlight X20 as listed by LED Wall Central (11.8M px, 20 Gigabit Ethernet); per-port figure is a 650K planning value, not published there",
  },
];
