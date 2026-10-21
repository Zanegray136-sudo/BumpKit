import type { Cable, NodeKind, Preset } from "../utils/signal";

/** A run of identical ports, e.g. [8, "HDMI"]. */
type Run = [count: number, cable: Cable];

export type GearItem = {
  brand: string;
  model: string;
  kind: NodeKind;
  ins: Run[];
  outs: Run[];
  /** Where the port counts came from */
  source: string;
  note?: string;
};

const BM = "Blackmagic";
const bmAtem = "https://www.blackmagicdesign.com/developer/products/atem/techspecs";

/**
 * Port counts are the video connectors on the box, taken from the maker's own spec page.
 * Control, audio, USB and network ports are left out. If you are not sure, check the spec sheet.
 */
export const avGear: GearItem[] = [
  // Blackmagic switchers
  { brand: BM, model: "ATEM Mini Pro", kind: "switcher", ins: [[4, "HDMI"]], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/fi/products/atemmini/techspecs/W-APS-13" },
  { brand: BM, model: "ATEM Mini Extreme ISO G2", kind: "switcher", ins: [[8, "HDMI"]], outs: [[3, "HDMI"]], source: "https://www.blackmagicdesign.com/au/products/atemmini/techspecs/W-ABP-03", note: "Also has a Thunderbolt video in and fill/key out." },
  { brand: BM, model: "ATEM Television Studio HD8", kind: "switcher", ins: [[8, "SDI"]], outs: [[3, "SDI"], [1, "SDI"], [1, "HDMI"]], source: bmAtem, note: "Outputs: program, 2 aux, then multiview on SDI and HDMI." },
  { brand: BM, model: "ATEM Television Studio 4K8", kind: "switcher", ins: [[8, "SDI"]], outs: [[11, "SDI"], [1, "SDI"], [1, "HDMI"]], source: bmAtem, note: "Outputs: program, 10 aux, then multiview on SDI and HDMI." },
  { brand: BM, model: "ATEM 1 M/E Constellation HD", kind: "switcher", ins: [[10, "SDI"]], outs: [[6, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM 2 M/E Constellation HD", kind: "switcher", ins: [[20, "SDI"]], outs: [[12, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM 4 M/E Constellation HD", kind: "switcher", ins: [[40, "SDI"]], outs: [[24, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM 4 M/E Constellation 4K", kind: "switcher", ins: [[40, "SDI"]], outs: [[28, "SDI"]], source: bmAtem },
  { brand: BM, model: "ATEM Constellation 8K", kind: "switcher", ins: [[40, "SDI"]], outs: [[28, "SDI"]], source: bmAtem },
  // Roland
  { brand: "Roland", model: "V-8HD", kind: "switcher", ins: [[8, "HDMI"]], outs: [[3, "HDMI"]], source: "https://www.fullcompass.com/common/files/45080-V8HDSpecifications.pdf" },
  { brand: "Roland", model: "V-60HD", kind: "switcher", ins: [[4, "SDI"], [2, "HDMI"]], outs: [[2, "SDI"], [2, "HDMI"], [1, "HDMI"]], source: "https://www.videocraft.com.au/roland-v-60hd-multi-format-hd-video-switcher", note: "Last output is the multiview HDMI. Input 6 also takes VGA." },
  { brand: "Roland", model: "V-160HD", kind: "switcher", ins: [[8, "HDMI"], [8, "SDI"]], outs: [[3, "HDMI"], [3, "SDI"]], source: "https://www.huss-licht-ton.de/print_product_info.php/products_id/42777" },
  // Presentation switchers
  { brand: "Barco", model: "E2 Gen 2 (full chassis)", kind: "switcher", ins: [[16, "SDI"], [12, "HDMI"], [12, "DisplayPort"]], outs: [[4, "SDI"], [13, "HDMI"], [1, "DisplayPort"]], source: "https://www.barco.com/manuals/R5905948/l74n3y1d3887.html", note: "Connectors depend on the cards fitted. This is the most the chassis can hold." },
  { brand: "Analog Way", model: "Aquilon RS4", kind: "switcher", ins: [[12, "HDMI"], [8, "DisplayPort"], [4, "SDI"]], outs: [[16, "HDMI"], [2, "HDMI"]], source: "https://www.rentex.com/wp-content/uploads/2019/11/Analog-Way-Aquilon-RS4-Data-Sheet.pdf", note: "Last 2 outputs are the multiviewers. Cards are swappable." },
  // Media servers
  { brand: "disguise", model: "vx 4", kind: "server", ins: [[16, "SDI"]], outs: [[4, "HDMI"]], source: "https://www.disguise.one/sites/default/files/2024-04/Products_Disguise%20vx%204_specs%20and%20playback%20data.pdf", note: "Outputs come from the video cards fitted. HDMI 2.0 cards ship as standard." },
  // Matrix routers
  { brand: BM, model: "Videohub 10x10 12G", kind: "other", ins: [[10, "SDI"]], outs: [[10, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Videohub 20x20 12G", kind: "other", ins: [[20, "SDI"]], outs: [[20, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Videohub 40x40 12G", kind: "other", ins: [[40, "SDI"]], outs: [[40, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Videohub 80x80 12G", kind: "other", ins: [[80, "SDI"]], outs: [[80, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs" },
  { brand: BM, model: "Smart Videohub 12x12", kind: "other", ins: [[12, "SDI"]], outs: [[12, "SDI"]], source: "https://www.blackmagicdesign.com/ca/developer/products/videohub/techspecs", note: "SD, HD and 6G only, not 12G." },
  // Ross Video
  { brand: "Ross", model: "Carbonite Ultra", kind: "switcher", ins: [[24, "SDI"]], outs: [[12, "SDI"]], source: "https://www.rossvideo.com/live-production/production-switchers/carbonite-ultra/specifications/", note: "HD mode. In UHD it drops to 18 inputs and 11 outputs. Last 2 outputs are multiviewers." },
  { brand: "Ross", model: "Carbonite Black", kind: "switcher", ins: [[36, "SDI"]], outs: [[22, "SDI"]], source: "https://www.rossvideo.com/live-production/production-switchers/carbonite-black/specifications", note: "HD mode. In UHD it drops to 9 inputs and 5 outputs." },
  { brand: "Ross", model: "Carbonite Black Plus", kind: "switcher", ins: [[36, "SDI"]], outs: [[25, "SDI"]], source: "https://www.rossvideo.com/live-production/production-switchers/carbonite-black/specifications", note: "HD mode. 3 of the outputs are multiviewer only." },
  { brand: "Ross", model: "Carbonite Black Plus 12G", kind: "switcher", ins: [[36, "SDI"]], outs: [[25, "SDI"]], source: "https://www.rossvideo.com/live-production/production-switchers/carbonite-black/specifications", note: "HD mode. UHD runs on 9 inputs and 5 outputs of 12G." },
  { brand: "Ross", model: "Graphite (13 input)", kind: "switcher", ins: [[12, "SDI"], [1, "HDMI"]], outs: [[6, "SDI"], [2, "HDMI"]], source: "https://www.rossvideo.com/products/production-switchers/graphite/graphite-specifications/", note: "The 5 and 9 input models have fewer. Check the exact SDI and HDMI split for your model." },
  { brand: "Ross", model: "Ultrix FR1 (16x16)", kind: "other", ins: [[16, "SDI"]], outs: [[16, "SDI"]], source: "https://www.markertek.com/product/ross-ult-ns-fr1/ross-ultrix-ns-fr1-ultrix-new-style-1ru-frame-with-16x16-2-aux-ultrimix-and-ultriclean-included", note: "Also has 2 AUX ports and can grow to 32x32 with another card." },
  { brand: "Ross", model: "Ultrix FR2 (16x16)", kind: "other", ins: [[16, "SDI"]], outs: [[16, "SDI"]], source: "https://rossvideo.com/infrastructure/routing-systems/ultrix/", note: "Built-in I/O only. More cards can be added." },
  // Grass Valley
  { brand: "Grass Valley", model: "K-Frame XP (base I/O)", kind: "switcher", ins: [[32, "SDI"]], outs: [[16, "SDI"]], source: "https://gvcmsumb.grassvalley.com/products/production-switchers/karrera-video-production-center", note: "The Standard frame grows to 192 inputs and 96 outputs. Also comes with IP I/O." },
  { brand: "Grass Valley", model: "K-Frame V-Series", kind: "switcher", ins: [[16, "SDI"]], outs: [[8, "SDI"]], source: "https://gvcmsumb.grassvalley.com/products/production-switchers/karrera-video-production-center", note: "Also has 2 media-port inputs and 2 media-port outputs, which are not shown here." },
  // Decimator
  { brand: "Decimator", model: "MD-HX", kind: "converter", ins: [[1, "HDMI"], [1, "SDI"]], outs: [[1, "HDMI"], [4, "SDI"]], source: "https://www.markertek.com/product/dec-md-hx/decimator-md-hx-mini-3g-hd-sd-sdi-to-hdmi-cross-converter-with-scaling-frame-rate-conversion", note: "Cross converter with scaling. The 4 SDI outputs are 2 loop-throughs and 2 converted." },
  { brand: "Decimator", model: "DMON-QUAD", kind: "converter", ins: [[4, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://videoguys.com.au/collections/decimator/products/decimator-dmon-quad-4-channel-3g-sdi-multiviewer", note: "Quad multiviewer." },
  { brand: "Decimator", model: "DMON-16S", kind: "converter", ins: [[16, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://fullcompass.com/prod/502602-decimator-dec-dmon-16s-16-channel-video-multiviewer-with-hdmi-and-sdi", note: "16-way multiviewer." },
  // More presentation switchers and utility gear
  { brand: "PixelHue", model: "P20", kind: "switcher", ins: [[4, "SDI"], [8, "HDMI"]], outs: [[8, "HDMI"], [4, "HDMI"], [1, "HDMI"], [8, "Fibre"]], source: "https://www.rentex.com/wp-content/uploads/2026/04/P20-P20-DS-Seamless-Switchers-Specifications-V1.7.1.pdf", note: "Outputs: 8 program, 4 aux, 1 multiviewer, then 8 fibre copies of the program outputs. Each of the 8 inputs takes HDMI or DisplayPort, one at a time." },
  { brand: "PixelHue", model: "P20 DS", kind: "switcher", ins: [[4, "SDI"], [8, "HDMI"]], outs: [[8, "HDMI"], [4, "HDMI"], [1, "HDMI"], [4, "SDI"], [8, "Fibre"]], source: "https://www.rentex.com/wp-content/uploads/2026/04/P20-P20-DS-Seamless-Switchers-Specifications-V1.7.1.pdf", note: "Outputs: 8 program, 4 aux, 1 multiviewer, 4 SDI copies, then 8 fibre copies. Also has Dante audio." },
  { brand: "PixelHue", model: "P80", kind: "switcher", ins: [[4, "SDI"], [8, "HDMI"], [4, "DisplayPort"]], outs: [[8, "HDMI"], [4, "HDMI"], [2, "HDMI"], [4, "SDI"], [8, "Fibre"]], source: "https://luxwave.vn/downloads/pixelhue/p80-datasheet.pdf", note: "Fixed I/O only. A swappable card adds more inputs. Outputs: 8 program, 4 aux, 2 multiviewer, 4 SDI, 8 fibre." },
  { brand: "Barco", model: "S3-4K Jr Gen 2", kind: "switcher", ins: [[4, "SDI"], [1, "HDMI"], [1, "DisplayPort"]], outs: [[8, "HDMI"], [4, "HDMI"]], source: "https://www.barco.com/en/product/s3-4k-jr-gen-2", note: "Last 4 outputs are the multiviewer." },
  { brand: "AJA", model: "Ki Pro Ultra 12G", kind: "converter", ins: [[4, "SDI"], [1, "HDMI"]], outs: [[4, "SDI"], [1, "HDMI"]], source: "https://files.hdtvsupply.com/aja-ki-pro-ultra-12g-ds.pdf", note: "Recorder and player. The first SDI port is 12G and the other three are 3G." },
  { brand: "Extron", model: "DXP 88 HD 4K PLUS", kind: "other", ins: [[8, "HDMI"]], outs: [[8, "HDMI"]], source: "https://creationnetworks.net/products/extron-dxp-88-hd-4k-plus-8x8-4k-60-hdmi-with-2-audio-outputs" },
  // Network switches
  { brand: "Netgear", model: "M4250-9G1F-PoE+", kind: "network", ins: [[9, "Cat6"], [1, "Fibre"]], outs: [[9, "Cat6"], [1, "Fibre"]], source: "https://www.shi.com/product/45192686/NETGEAR-AV-Line-M4250-9G1F-PoE", note: "Ethernet ports work both ways, so each port is listed on both sides. Use either side. 8 ports are PoE+. The SFP is listed as 1G in one place and 10G in another." },
  { brand: "Netgear", model: "M4250-26G4F-PoE+", kind: "network", ins: [[26, "Cat6"], [4, "Fibre"]], outs: [[26, "Cat6"], [4, "Fibre"]], source: "https://www.shi.com/product/42001450/NETGEAR-AV-Line-M4250-26G4F-PoE", note: "Ethernet ports work both ways, so each port is listed on both sides. Use either side. 24 ports are PoE+ and 4 are SFP." },
  { brand: "Netgear", model: "M4250-40G8F-PoE+", kind: "network", ins: [[40, "Cat6"], [8, "Fibre"]], outs: [[40, "Cat6"], [8, "Fibre"]], source: "https://www.shi.com/product/42001453/NETGEAR-AV-Line-M4250-40G8F-PoE", note: "Ethernet ports work both ways, so each port is listed on both sides. Use either side. All 40 copper ports are PoE+ and the 8 SFP ports are 1G." },
  { brand: "Luminex", model: "GigaCore 16i", kind: "network", ins: [[12, "Cat6"], [4, "Fibre"]], outs: [[12, "Cat6"], [4, "Fibre"]], source: "https://www.markertek.com/product/lmx-lu010009010g/luminex-lu0100090-10g-gigacore-16i-12-port-1-gb-rj-45-ethernet-switch-with-4x-10-gb-sfp-cages", note: "Ethernet ports work both ways, so each port is listed on both sides. Use either side. The 4 fibre ports are 10G SFP+." },
  { brand: "Luminex", model: "GigaCore 26i", kind: "network", ins: [[24, "Cat6"], [6, "Fibre"]], outs: [[24, "Cat6"], [6, "Fibre"]], source: "https://www.ac-et.com/products/luminex-gigacore-26i", note: "Ethernet ports work both ways, so each port is listed on both sides. Ports 21 to 24 share a socket with an SFP, so you can use only one of each pair." },
  { brand: "Luminex", model: "GigaCore 30i", kind: "network", ins: [[24, "Cat6"], [6, "Fibre"]], outs: [[24, "Cat6"], [6, "Fibre"]], source: "https://www.markertek.com/product/lmx-gc30ipoepp2p/luminex-gigacore-30i-10gb-ethernet-av-network-switch-with-24x-rj45-6x-sfp-cages-poe-500watt-psu", note: "Ethernet ports work both ways, so each port is listed on both sides. Use either side. 6 SFP+ cages at 10G or 1G." },
  { brand: "Ubiquiti", model: "UniFi USW-Pro-Max-24-PoE", kind: "network", ins: [[24, "Cat6"], [2, "Fibre"]], outs: [[24, "Cat6"], [2, "Fibre"]], source: "https://www.pbtech.co.nz/product/SWHUBI2403261/Ubiquiti-Unifi-USW-Pro-Max-24-PoE-26-Port-10G-L3-M", note: "Ethernet ports work both ways, so each port is listed on both sides. Use either side. 16 ports are 1G and 8 are 2.5G. The 2 fibre ports are 10G SFP+." },
  // Control surfaces
  { brand: "Elgato", model: "Stream Deck XL", kind: "control", ins: [], outs: [[1, "USB"]], source: "https://avlgear.com/products/elgato-stream-deck-xl-and-stream-deck-network-dock", note: "Plugs into a computer over USB." },
  { brand: "Elgato", model: "Stream Deck Network Dock", kind: "control", ins: [[1, "Cat6"]], outs: [[1, "USB"]], source: "https://avlgear.com/products/elgato-stream-deck-xl-and-stream-deck-network-dock", note: "Ethernet in (PoE or powered over USB-C). The Stream Deck plugs into its USB port." },
  // Cameras
  { brand: "Panasonic", model: "AW-UE150", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://eu.connect.panasonic.com/gb/en/broadcast-proav/remote-ptz-camera-systems/aw-ue150", note: "12G-SDI and 3G-SDI outputs plus HDMI 2.0. Fibre and IP are options and are not shown." },
  { brand: "Panasonic", model: "AW-UE100", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.afcinema.com/IMG/pdf/5/c/9/aw-ue100-datasheet.pdf", note: "12G-SDI and 3G-SDI outputs plus HDMI 2.0." },
  { brand: "Panasonic", model: "AW-UE160", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.adorama.com/pcawue160wp3.html", note: "The page does not give exact connector counts, so check the spec sheet. Fibre and ST 2110 IP are also listed." },
  { brand: "Sony", model: "BRC-X400", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://videoguys.com.au/products/sony-brc-x400-4k-ptz-camera-with-hdmi-ip-3g-sdi-output-black", note: "Also streams over IP." },
  { brand: "Sony", model: "BRC-X1000", kind: "camera", ins: [], outs: [[4, "SDI"], [1, "HDMI"]], source: "https://avlgear.com/collections/sony/products/sony-brc-x1000-4k-ptz-3g-sdi-camera", note: "HD mode. In 4K it uses 2 dual-link 3G-SDI outputs instead." },
  { brand: "Sony", model: "BRC-H800", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.fullcompass.com/prod/525832-sony-brc-h800-1-hd-ptz-camera-with-12x-optical-zoom", note: "SDI outputs are labelled Mon and Line." },
  { brand: "Canon", model: "CR-N700", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://canon-europe.com/ptz-cameras/cr-n700/specifications", note: "One 12G-SDI and one 3G-SDI output." },
  { brand: "Canon", model: "CR-N500", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://my.canon/en/business/cr-n500/specification" },
  { brand: "Canon", model: "CR-N300", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.adorama.com/cacrn300bb.html" },
  { brand: "Canon", model: "CR-X300", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://canon-europe.com/ptz-cameras/cr-x300/specifications", note: "SDI and HDMI share a format. Choosing 4K on one turns the other off." },
  { brand: "JVC", model: "KY-PZ400", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://uk.jvc.com/pro/camcorders/ptz/KY-PZ400NWE/", note: "The page does not state connector counts, so check the spec sheet." },
  { brand: "JVC", model: "KY-PZ510", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.adorama.com/jvkypz510bu.html" },
  { brand: BM, model: "Studio Camera 4K Plus G2", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstudiocamera/models", note: "SDI input is the program return." },
  { brand: BM, model: "Studio Camera 4K Pro G2", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstudiocamera/models", note: "SDI input is the program return. 10G Ethernet is not shown." },
  { brand: BM, model: "Studio Camera 6K Pro", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstudiocamera/models", note: "SDI input is the program return. 10G Ethernet is not shown." },
  { brand: BM, model: "URSA Broadcast G2", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "SDI"]], source: "https://www.blackmagicdesign.com/products/blackmagicursabroadcast/techspecs", note: "Outputs are main and monitor. No HDMI." },
  { brand: BM, model: "PYXIS 6K", kind: "camera", ins: [], outs: [[1, "SDI"]], source: "https://www.blackmagicdesign.com/es/products/blackmagicpyxis/techspecs", note: "12G-SDI. No HDMI." },
  { brand: BM, model: "PYXIS 12K", kind: "camera", ins: [], outs: [[1, "SDI"]], source: "https://www.blackmagicdesign.com/es/products/blackmagicpyxis/techspecs", note: "12G-SDI. No HDMI." },
  // Set-top and streaming boxes
  { brand: "Apple", model: "Apple TV 4K", kind: "source", ins: [], outs: [[1, "HDMI"]], source: "https://apple.com/uk/apple-tv-4k/specs" },
];

/** Generic starting points that are not tied to a brand. */
export const genericGear: GearItem[] = [
  { brand: "Generic", model: "Router (5 port)", kind: "network", ins: [[5, "Cat6"]], outs: [[5, "Cat6"]], source: "", note: "1 WAN and 4 LAN. Ports work both ways, so each is listed on both sides." },
  { brand: "Generic", model: "Network switch (8 port)", kind: "network", ins: [[8, "Cat6"]], outs: [[8, "Cat6"]], source: "", note: "Ports work both ways, so each is listed on both sides." },
  { brand: "Generic", model: "Network switch (16 port)", kind: "network", ins: [[16, "Cat6"]], outs: [[16, "Cat6"]], source: "", note: "Ports work both ways, so each is listed on both sides." },
  { brand: "Generic", model: "Network switch (24 port)", kind: "network", ins: [[24, "Cat6"]], outs: [[24, "Cat6"]], source: "", note: "Ports work both ways, so each is listed on both sides." },
  { brand: "Generic", model: "Control surface (USB)", kind: "control", ins: [], outs: [[1, "USB"]], source: "" },
  { brand: "Generic", model: "Control surface (Ethernet)", kind: "control", ins: [], outs: [[1, "Cat6"]], source: "" },
  { brand: "Generic", model: "USB capture card", kind: "converter", ins: [[1, "HDMI"]], outs: [[1, "USB"]], source: "" },
  { brand: "Generic", model: "Laptop (HDMI)", kind: "source", ins: [], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "Laptop (DisplayPort)", kind: "source", ins: [], outs: [[1, "DisplayPort"]], source: "" },
  { brand: "Generic", model: "Camera (SDI)", kind: "camera", ins: [], outs: [[1, "SDI"]], source: "" },
  { brand: "Generic", model: "Camera (HDMI)", kind: "camera", ins: [], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "Set-top box (HDMI)", kind: "source", ins: [], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "Streaming stick (HDMI)", kind: "source", ins: [], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "Display (HDMI)", kind: "projector", ins: [[1, "HDMI"]], outs: [], source: "" },
  { brand: "Generic", model: "Projector (SDI)", kind: "projector", ins: [[1, "SDI"]], outs: [], source: "" },
  { brand: "Generic", model: "Converter HDMI to SDI", kind: "converter", ins: [[1, "HDMI"]], outs: [[1, "SDI"]], source: "" },
  { brand: "Generic", model: "Converter SDI to HDMI", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "HDMI"]], source: "" },
  { brand: "Generic", model: "HDMI splitter 1x4", kind: "converter", ins: [[1, "HDMI"]], outs: [[4, "HDMI"]], source: "" },
  { brand: "Generic", model: "SDI distribution amp 1x4", kind: "converter", ins: [[1, "SDI"]], outs: [[4, "SDI"]], source: "" },
];

const expand = (runs: Run[]): Cable[] => runs.flatMap(([n, c]) => Array.from({ length: n }, () => c));

/** The ready-made box for a catalogue entry. */
export function presetOf(g: GearItem): Preset {
  const ins = expand(g.ins);
  const outs = expand(g.outs);
  const same = (a: Cable[]) => a.length > 0 && a.every((c) => c === a[0]);
  return {
    name: g.brand === "Generic" ? g.model : `${g.brand} ${g.model}`,
    kind: g.kind,
    ins: ins.length,
    outs: outs.length,
    ...(same(ins) ? { inType: ins[0] } : ins.length ? { inTypes: ins } : {}),
    ...(same(outs) ? { outType: outs[0] } : outs.length ? { outTypes: outs } : {}),
  };
}

/** "8 HDMI, 8 SDI in  >  3 HDMI out" for a ready-made box. */
export function portSummary(p: Preset): string {
  const side = (n: number, one?: Cable, many?: Cable[]) => {
    if (n === 0) return "";
    const list = many && many.length ? many : Array.from({ length: n }, () => one);
    const counts: string[] = [];
    let prev = "";
    let count = 0;
    for (const c of list) {
      const label = c ?? "any";
      if (label === prev) count++;
      else {
        if (count) counts.push(`${count} ${prev}`);
        prev = label;
        count = 1;
      }
    }
    if (count) counts.push(`${count} ${prev}`);
    return counts.join(", ");
  };
  const i = side(p.ins, p.inType, p.inTypes);
  const o = side(p.outs, p.outType, p.outTypes);
  if (i && o) return `In ${i}  ·  Out ${o}`;
  if (i) return `In ${i}`;
  if (o) return `Out ${o}`;
  return "no ports";
}
