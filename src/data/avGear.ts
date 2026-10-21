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
  /** Overrides the panel category that the kind would give, e.g. recorders. */
  group?: string;
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
  { brand: "Panasonic", model: "AW-UE150", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://eu.connect.panasonic.com/gb/en/broadcast-proav/remote-ptz-camera-systems/aw-ue150", note: "12G-SDI and 3G-SDI outputs plus HDMI 2.0. Fibre and IP are options and are not shown. NDI|HX output needs a licence or firmware option on some units." },
  { brand: "Panasonic", model: "AW-UE100", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://www.afcinema.com/IMG/pdf/5/c/9/aw-ue100-datasheet.pdf", note: "12G-SDI and 3G-SDI outputs plus HDMI 2.0. NDI|HX output needs a licence or firmware option on some units." },
  { brand: "Panasonic", model: "AW-UE160", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://www.adorama.com/pcawue160wp3.html", note: "The page does not give exact connector counts, so check the spec sheet. Fibre and ST 2110 IP are also listed. NDI|HX output needs a licence or firmware option on some units." },
  { brand: "Sony", model: "BRC-X400", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://videoguys.com.au/products/sony-brc-x400-4k-ptz-camera-with-hdmi-ip-3g-sdi-output-black", note: "Also streams over IP. NDI|HX output needs a licence or firmware option on some units." },
  { brand: "Sony", model: "BRC-X1000", kind: "camera", ins: [], outs: [[4, "SDI"], [1, "HDMI"]], source: "https://avlgear.com/collections/sony/products/sony-brc-x1000-4k-ptz-3g-sdi-camera", note: "HD mode. In 4K it uses 2 dual-link 3G-SDI outputs instead." },
  { brand: "Sony", model: "BRC-H800", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.fullcompass.com/prod/525832-sony-brc-h800-1-hd-ptz-camera-with-12x-optical-zoom", note: "SDI outputs are labelled Mon and Line." },
  { brand: "Canon", model: "CR-N700", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://canon-europe.com/ptz-cameras/cr-n700/specifications", note: "One 12G-SDI and one 3G-SDI output. NDI|HX output needs a licence or firmware option on some units." },
  { brand: "Canon", model: "CR-N500", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://my.canon/en/business/cr-n500/specification", note: "NDI|HX output needs a licence or firmware option on some units." },
  { brand: "Canon", model: "CR-N300", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://www.adorama.com/cacrn300bb.html", note: "NDI|HX output needs a licence or firmware option on some units." },
  { brand: "Canon", model: "CR-X300", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://canon-europe.com/ptz-cameras/cr-x300/specifications", note: "SDI and HDMI share a format. Choosing 4K on one turns the other off. NDI|HX output needs a licence or firmware option on some units." },
  { brand: "JVC", model: "KY-PZ400", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://uk.jvc.com/pro/camcorders/ptz/KY-PZ400NWE/", note: "The page does not state connector counts, so check the spec sheet." },
  { brand: "JVC", model: "KY-PZ510", kind: "camera", ins: [], outs: [[2, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://www.adorama.com/jvkypz510bu.html", note: "NDI|HX output needs a licence or firmware option on some units." },
  { brand: BM, model: "Studio Camera 4K Plus G2", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstudiocamera/models", note: "SDI input is the program return." },
  { brand: BM, model: "Studio Camera 4K Pro G2", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstudiocamera/models", note: "SDI input is the program return. 10G Ethernet is not shown." },
  { brand: BM, model: "Studio Camera 6K Pro", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstudiocamera/models", note: "SDI input is the program return. 10G Ethernet is not shown." },
  { brand: BM, model: "URSA Broadcast G2", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "SDI"]], source: "https://www.blackmagicdesign.com/products/blackmagicursabroadcast/techspecs", note: "Outputs are main and monitor. No HDMI." },
  { brand: BM, model: "PYXIS 6K", kind: "camera", ins: [], outs: [[1, "SDI"]], source: "https://www.blackmagicdesign.com/es/products/blackmagicpyxis/techspecs", note: "12G-SDI. No HDMI." },
  { brand: BM, model: "PYXIS 12K", kind: "camera", ins: [], outs: [[1, "SDI"]], source: "https://www.blackmagicdesign.com/es/products/blackmagicpyxis/techspecs", note: "12G-SDI. No HDMI." },
  { brand: "Panasonic", model: "AW-UE80", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"], [1, "NDI"]], source: "https://pro-av.panasonic.net/en/products/aw-ue80/", note: "3G-SDI and HDMI outputs. NDI|HX needs a licence or firmware option." },
  { brand: "Sony", model: "FX6", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://pro.sony/ue_US/products/handheld-camcorders/ilme-fx6v", note: "12G-SDI and HDMI outputs." },
  { brand: "Sony", model: "FX9", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://pro.sony/ue_US/products/handheld-camcorders/pxw-fx9", note: "12G-SDI and HDMI outputs." },
  { brand: "Sony", model: "PXW-Z190", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://pro.sony/ue_US/products/handheld-camcorders/pxw-z190", note: "3G-SDI and HDMI outputs." },
  { brand: "Canon", model: "C300 Mark III", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.usa.canon.com/shop/p/eos-c300-mark-iii", note: "12G-SDI and HDMI outputs." },
  { brand: "Canon", model: "C500 Mark II", kind: "camera", ins: [], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.usa.canon.com/shop/p/eos-c500-mark-ii", note: "12G-SDI and HDMI outputs." },
  { brand: BM, model: "Pocket 6K Pro", kind: "camera", ins: [], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs", note: "HDMI only, no SDI." },
  // Capture, encoders and monitors
  { brand: "Magewell", model: "Pro Convert HDMI 4K+", kind: "converter", ins: [[1, "HDMI"]], outs: [[1, "NDI"]], source: "https://www.magewell.com/products/pro-convert-hdmi-4k-plus", note: "Encodes HDMI to NDI|HX over Ethernet." },
  { brand: "Magewell", model: "Pro Convert NDI-HDMI 4K+", kind: "converter", ins: [[1, "NDI"]], outs: [[1, "HDMI"]], source: "https://www.magewell.com/products/pro-convert-ndi-to-hdmi-4k-plus", note: "Decodes NDI to HDMI." },
  { brand: "Atomos", model: "Shogun Connect", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.atomos.com/products/shogun-connect", note: "SDI and HDMI inputs, with loop outputs. Also does NDI over Ethernet." },
  { brand: BM, model: "Mini Conv SDI-HDMI 6G", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/miniconverters/techspecs", note: "Second output is the SDI loop." },
  { brand: BM, model: "Mini Conv HDMI-SDI 6G", kind: "converter", ins: [[1, "HDMI"]], outs: [[2, "SDI"]], source: "https://www.blackmagicdesign.com/products/miniconverters/techspecs" },
  // More switchers and matrix routers
  { brand: BM, model: "ATEM Mini", kind: "switcher", ins: [[4, "HDMI"]], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/atemmini/techspecs", note: "Also has a USB webcam output." },
  { brand: BM, model: "ATEM Mini Pro ISO", kind: "switcher", ins: [[4, "HDMI"]], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/atemmini/techspecs", note: "Also has a USB webcam output." },
  { brand: "Kramer", model: "VS-44H2 (4x4 HDMI)", kind: "other", ins: [[4, "HDMI"]], outs: [[4, "HDMI"]], source: "https://www.kramerav.com/us/product/VS-44H2" },
  { brand: "Kramer", model: "VS-88H2 (8x8 HDMI)", kind: "other", ins: [[8, "HDMI"]], outs: [[8, "HDMI"]], source: "https://www.kramerav.com/us/product/VS-88H2" },
  { brand: "Lightware", model: "MX2-8x8-HDMI20", kind: "other", ins: [[8, "HDMI"]], outs: [[8, "HDMI"]], source: "https://lightware.com/pdf/MX2-8x8-HDMI20-A-datasheet.pdf", note: "Fixed 8x8 HDMI 2.0 matrix." },
  // Blackmagic: more ATEM, recorders, converters, monitors, streaming, capture (spec pages checked)
  { brand: BM, model: "ATEM SDI", kind: "switcher", ins: [[4, "SDI"]], outs: [[3, "SDI"]], source: "https://www.blackmagicdesign.com/products/atemsdi/techspecs", note: "The page lists 3 outputs in total but its program and aux breakdown does not add up. Check the spec sheet. Inputs are 3G-SDI." },
  { brand: BM, model: "ATEM SDI Pro ISO", kind: "switcher", ins: [[4, "SDI"]], outs: [[3, "SDI"]], source: "https://www.blackmagicdesign.com/products/atemsdi/techspecs", note: "The page lists 3 outputs in total but its breakdown does not add up. Check the spec sheet. Inputs are 3G-SDI." },
  { brand: BM, model: "ATEM SDI Extreme ISO", kind: "switcher", ins: [[8, "SDI"]], outs: [[6, "SDI"]], source: "https://www.blackmagicdesign.com/products/atemsdi/techspecs", note: "The page lists 6 outputs in total but its breakdown does not add up. Check the spec sheet. Inputs are 3G-SDI." },
  { brand: BM, model: "ATEM 1 M/E Constellation 4K", kind: "switcher", ins: [[10, "SDI"]], outs: [[6, "SDI"]], source: "https://www.blackmagicdesign.com/products/atemconstellation/techspecs", note: "12G-SDI. Multiview is set up on the outputs." },
  { brand: BM, model: "ATEM 2 M/E Constellation 4K", kind: "switcher", ins: [[20, "SDI"]], outs: [[12, "SDI"]], source: "https://www.blackmagicdesign.com/products/atemconstellation/techspecs", note: "12G-SDI. Multiview is set up on the outputs." },
  { brand: BM, model: "ATEM 4 M/E Constellation 4K Plus", kind: "switcher", ins: [[80, "SDI"]], outs: [[52, "SDI"]], source: "https://www.blackmagicdesign.com/products/atemconstellation/techspecs", note: "12G-SDI. 48 aux plus 4 multiview." },
  { brand: BM, model: "HyperDeck Studio HD Mini", kind: "other", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckstudio/techspecs", note: "No HDMI input.", group: "Recorders and keyers" },
  { brand: BM, model: "HyperDeck Studio HD Plus", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[3, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckstudio/techspecs", note: "SDI outputs are 2 video (fill and key) plus 1 monitor.", group: "Recorders and keyers" },
  { brand: BM, model: "HyperDeck Studio HD Pro", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[3, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckstudio/techspecs", note: "SDI outputs are 2 video (fill and key) plus 1 monitor.", group: "Recorders and keyers" },
  { brand: BM, model: "HyperDeck Studio 4K Pro", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[3, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckstudio/techspecs", note: "12G-SDI. SDI outputs are 2 video plus 1 monitor.", group: "Recorders and keyers" },
  { brand: BM, model: "HyperDeck Extreme 4K HDR", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[3, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckextreme/techspecs", note: "SDI outputs are two 12G (A and B) plus a 3G monitor.", group: "Recorders and keyers" },
  { brand: BM, model: "HyperDeck Extreme 8K HDR", kind: "other", ins: [[4, "SDI"], [1, "HDMI"]], outs: [[5, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckextreme/techspecs", note: "SDI outputs are four 12G (A to D) plus a 3G monitor.", group: "Recorders and keyers" },
  { brand: BM, model: "HyperDeck Shuttle HD", kind: "other", ins: [[1, "HDMI"]], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckshuttle/techspecs", note: "No SDI.", group: "Recorders and keyers" },
  { brand: BM, model: "HyperDeck Shuttle 4K Pro", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[4, "SDI"], [2, "HDMI"]], source: "https://www.blackmagicdesign.com/products/hyperdeckshuttle/techspecs", note: "SDI outputs are 1 loop, 2 video and 1 monitor. HDMI outputs are video and monitor.", group: "Recorders and keyers" },
  { brand: BM, model: "Videohub Mini 4x2 12G", kind: "other", ins: [[4, "SDI"]], outs: [[2, "SDI"]], source: "https://www.blackmagicdesign.com/products/blackmagicvideohubmini/techspecs" },
  { brand: BM, model: "Videohub Mini 6x2 12G", kind: "other", ins: [[6, "SDI"]], outs: [[2, "SDI"]], source: "https://www.blackmagicdesign.com/products/blackmagicvideohubmini/techspecs", note: "Also has a reference input and loop." },
  { brand: BM, model: "Videohub Mini 8x4 12G", kind: "other", ins: [[8, "SDI"]], outs: [[4, "SDI"]], source: "https://www.blackmagicdesign.com/products/blackmagicvideohubmini/techspecs", note: "Also has a reference input and loop." },
  { brand: BM, model: "Micro Conv HDMI-SDI 3G", kind: "converter", ins: [[1, "HDMI"]], outs: [[2, "SDI"]], source: "https://www.blackmagicdesign.com/products/microconverters/techspecs", note: "Micro converter, powered over USB." },
  { brand: BM, model: "Micro Conv SDI-HDMI 3G", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/microconverters/techspecs", note: "The SDI output is a loop." },
  { brand: BM, model: "Micro Conv BiDi SDI/HDMI 3G", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/microconverters/techspecs", note: "Works one direction at a time." },
  { brand: BM, model: "Micro Conv HDMI-SDI 12G", kind: "converter", ins: [[1, "HDMI"]], outs: [[2, "SDI"]], source: "https://www.blackmagicdesign.com/products/microconverters/techspecs", note: "Micro converter, powered over USB." },
  { brand: BM, model: "Micro Conv SDI-HDMI 12G", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/microconverters/techspecs", note: "The SDI output is a loop." },
  { brand: BM, model: "Micro Conv BiDi SDI/HDMI 12G", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/microconverters/techspecs", note: "Works one direction at a time." },
  { brand: BM, model: "Teranex Mini SDI-HDMI 8K", kind: "converter", ins: [[4, "SDI"]], outs: [[4, "SDI"], [4, "HDMI"]], source: "https://www.blackmagicdesign.com/products/teranexmini8k/techspecs", note: "12G-SDI in with loop outs. Quad link for 8K." },
  { brand: BM, model: "Teranex Mini SDI-DP 8K", kind: "converter", ins: [[4, "SDI"]], outs: [[4, "SDI"], [2, "DisplayPort"]], source: "https://www.blackmagicdesign.com/products/teranexmini8k/techspecs", note: "Also has a USB-C DisplayPort output. 2 DisplayPorts carry 8K." },
  { brand: BM, model: "Video Assist 5\" 3G", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicvideoassist/techspecs", note: "Recorder and monitor. Output may not pass the input through.", group: "Recorders and keyers" },
  { brand: BM, model: "Video Assist 7\" 3G", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicvideoassist/techspecs", note: "Recorder and monitor. Output may not pass the input through.", group: "Recorders and keyers" },
  { brand: BM, model: "Video Assist 5\" 12G HDR", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicvideoassist/techspecs", note: "Recorder and monitor. Output may not pass the input through.", group: "Recorders and keyers" },
  { brand: BM, model: "Video Assist 7\" 12G HDR", kind: "other", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicvideoassist/techspecs", note: "Recorder and monitor. Output may not pass the input through.", group: "Recorders and keyers" },
  { brand: BM, model: "SmartView 4K G3", kind: "screen", ins: [[2, "SDI"]], outs: [[1, "SDI"]], source: "https://www.blackmagicdesign.com/products/smartview4k/techspecs", note: "12G-SDI, reclocked loop out. Also takes SMPTE 2110 over its SFP cage and Ethernet." },
  { brand: BM, model: "Streaming Encoder 4K", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "SDI"], [1, "HDMI"], [1, "Cat6"]], source: "https://www.blackmagicdesign.com/products/blackmagicstreamingprocessors/techspecs", note: "Outputs: SDI loop, SDI monitor, HDMI monitor, and the stream over Ethernet." },
  { brand: BM, model: "Streaming Encoder HD", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "SDI"], [1, "HDMI"], [1, "Cat6"]], source: "https://www.blackmagicdesign.com/products/blackmagicstreamingprocessors/techspecs", note: "Outputs: SDI loop, SDI monitor, HDMI monitor, and the stream over Ethernet." },
  { brand: BM, model: "Streaming Decoder 4K", kind: "converter", ins: [[1, "Cat6"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstreamingprocessors/techspecs", note: "Takes the stream over Ethernet. Also has a reference input and output." },
  { brand: BM, model: "ATEM Streaming Bridge", kind: "converter", ins: [[1, "Cat6"]], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicstreamingprocessors/techspecs", note: "Takes the stream over Ethernet. Also has a reference input." },
  { brand: BM, model: "UltraStudio Rec 3G", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "USB"]], source: "https://www.blackmagicdesign.com/products/ultrastudio/techspecs", note: "Capture. SDI and HDMI inputs, USB-C to the computer." },
  { brand: BM, model: "UltraStudio Mon 3G", kind: "converter", ins: [[1, "USB"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/ultrastudio/techspecs", note: "Playback. USB-C from the computer to SDI and HDMI." },
  { brand: BM, model: "UltraStudio HD Mini", kind: "converter", ins: [[1, "SDI"]], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/ultrastudio/techspecs", note: "Thunderbolt link to the computer is not shown. SDI outs are fill and key. No HDMI input." },
  { brand: BM, model: "UltraStudio 4K Mini", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[3, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/ultrastudio/techspecs", note: "Thunderbolt link to the computer is not shown. SDI outs are 2 program and 1 loop." },
  { brand: BM, model: "UltraStudio 4K Ext 3", kind: "converter", ins: [[4, "SDI"], [1, "HDMI"]], outs: [[4, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/ultrastudio/techspecs", note: "Thunderbolt link is not shown. Also has repeated and loop outputs that are not counted here." },
  { brand: BM, model: "Micro Studio Camera 4K G2", kind: "camera", ins: [[1, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicmicrostudiocamera/techspecs", note: "12G-SDI. SDI input is for program return. HDMI is HD only." },
  { brand: BM, model: "URSA Mini Pro 4.6K G2", kind: "camera", ins: [[1, "SDI"]], outs: [[2, "SDI"]], source: "https://www.blackmagicdesign.com/products/blackmagicursaminipro/techspecs", note: "Outputs are program and monitor SDI. No HDMI." },
  { brand: BM, model: "URSA Mini Pro 12K", kind: "camera", ins: [[1, "SDI"]], outs: [[2, "SDI"]], source: "https://www.blackmagicdesign.com/products/blackmagicursaminipro/techspecs", note: "Outputs are 12G program and 3G monitor SDI. No HDMI." },
  { brand: BM, model: "Pocket Cinema 4K", kind: "camera", ins: [], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs", note: "HDMI only, no SDI." },
  { brand: BM, model: "Pocket Cinema 6K G2", kind: "camera", ins: [], outs: [[1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs", note: "HDMI only, no SDI." },
  { brand: BM, model: "Ultimatte 12 HD Mini", kind: "other", ins: [[2, "SDI"], [2, "HDMI"]], outs: [[2, "SDI"], [1, "HDMI"]], source: "https://www.blackmagicdesign.com/products/ultimatte/techspecs", note: "Inputs: monitor and return SDI plus 2 HDMI.", group: "Recorders and keyers" },
  { brand: BM, model: "Ultimatte 12 HD", kind: "other", ins: [[5, "SDI"]], outs: [[5, "SDI"]], source: "https://www.blackmagicdesign.com/products/ultimatte/techspecs", note: "Outputs are 4 SDI plus 1 loop.", group: "Recorders and keyers" },
  { brand: BM, model: "Ultimatte 12 4K", kind: "other", ins: [[8, "SDI"]], outs: [[16, "SDI"]], source: "https://www.blackmagicdesign.com/products/ultimatte/techspecs", note: "Outputs are 9 SDI plus 7 loops. Also has ST 2110 IP in and out.", group: "Recorders and keyers" },
  { brand: BM, model: "Ultimatte 12 8K", kind: "other", ins: [[32, "SDI"]], outs: [[40, "SDI"]], source: "https://www.blackmagicdesign.com/products/ultimatte/techspecs", note: "Outputs are 20 SDI plus 20 loops.", group: "Recorders and keyers" },
  // Decimator: rest of the range
  { brand: "Decimator", model: "MD-LX", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.rentex.com/rental-products/decimator-md-lx/", note: "Bi-directional. One SDI and one HDMI connector, and it works out the direction itself. Treat it as one in and one out at a time." },
  { brand: "Decimator", model: "MD-CROSS V2", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "HDMI"], [4, "SDI"]], source: "https://ministryoftech.com.au/?p=1349", note: "Cross converter. The retailer page is inconsistent about the SDI outputs: loop plus 2, or 4. Check the manual." },
  { brand: "Decimator", model: "12G-CROSS", kind: "converter", ins: [[1, "SDI"], [1, "HDMI"]], outs: [[1, "HDMI"], [4, "SDI"]], source: "https://ministryoftech.com.au/?p=1349", note: "4K cross converter. Input counts are not stated on the page, so check the manual." },
  { brand: "Decimator", model: "MD-DUCC", kind: "converter", ins: [[1, "SDI"]], outs: [[3, "SDI"], [1, "HDMI"]], source: "https://videoguys.com.au/collections/decimator/products/decimator-md-ducc-multi-definition-down-up-cross-converter", note: "SDI outputs are 1 loop plus 2. Also has analog video out, which is not shown." },
  { brand: "Decimator", model: "DMON-16SL", kind: "converter", ins: [[16, "SDI"]], outs: [[1, "HDMI"]], source: "https://markertek.com/product/dec-dmon-16sl/decimator-designs-dmon-16sl-16-channel-multi-viewer-with-hdmi-output-for-3g-hd-sd", note: "16-way multiviewer. HDMI output only, no SDI out." },
  { brand: "Decimator", model: "DMON-12S", kind: "converter", ins: [[12, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.fullcompass.com/brand/dcm-decimator/video-photo/", note: "12-way multiviewer with HDMI and SDI outputs. Counts come from the product title, so check the spec sheet." },
  { brand: "Decimator", model: "DMON-6S", kind: "converter", ins: [[6, "SDI"]], outs: [[1, "SDI"], [1, "HDMI"]], source: "https://www.fullcompass.com/brand/dcm-decimator/video-photo/", note: "6-way multiviewer with HDMI and SDI outputs. Counts come from the product title, so check the spec sheet." },
  { brand: "Decimator", model: "DMON-4S", kind: "converter", ins: [[4, "SDI"]], outs: [[1, "HDMI"]], source: "https://www.fullcompass.com/brand/dcm-decimator/video-photo/", note: "Quad multiviewer with HDMI out. Check the spec sheet for any SDI out." },
  { brand: "Decimator", model: "DEC-MD-QUAD", kind: "converter", ins: [[4, "SDI"]], outs: [[1, "HDMI"]], source: "https://www.fullcompass.com/brand/dcm-decimator/video-photo/", note: "Miniature quad split with HDMI out. Check the spec sheet for any SDI out." },
  { brand: "Decimator", model: "Decimator 2", kind: "converter", ins: [[1, "SDI"]], outs: [[1, "HDMI"]], source: "https://www.fullcompass.com/brand/dcm-decimator/video-photo/", note: "SDI to HDMI. Check the spec sheet for any SDI loop." },
  { brand: "Decimator", model: "MC-DMON-9S", kind: "converter", ins: [[9, "SDI"]], outs: [[1, "SDI"]], source: "https://www.fullcompass.com/brand/dcm-decimator/video-photo/", note: "openGear card, 9-way multiviewer. Output count is not confirmed, so check the spec sheet." },
  // Barco: more processors, controller and projectors
  { brand: "Barco", model: "E3 (example config)", kind: "switcher", ins: [[4, "SDI"], [8, "HDMI"], [4, "DisplayPort"]], outs: [[4, "SDI"], [4, "HDMI"]], source: "https://nationwidevideo.com/gear/barco-encore3-e3/", note: "Connectors depend on the cards fitted. The standard build is 16 inputs and 8 outputs, and this is one example split. Change the port types to match your cards." },
  { brand: "Barco", model: "E2 Jr (example config)", kind: "switcher", ins: [[4, "SDI"], [6, "HDMI"], [6, "DisplayPort"]], outs: [[4, "SDI"], [4, "HDMI"], [2, "HDMI"]], source: "https://www.audiogeneral.com/store/products/view/0602-2510", note: "The page lists 16 inputs and 10 outputs (last 2 are multiview) but the SDI, HDMI and DisplayPort split depends on the cards. This is one example. Change the port types to match your cards." },
  { brand: "Barco", model: "PDS-4K (HDMI)", kind: "switcher", ins: [[6, "HDMI"]], outs: [[4, "HDMI"], [1, "HDMI"]], source: "https://www.barco.com/ko/product/pds-4k", note: "Last output is the multiviewer. Two outputs run UHD at 60, or four run UHD at 30." },
  { brand: "Barco", model: "PDS-4K (HDMI and SDI)", kind: "switcher", ins: [[6, "HDMI"], [2, "SDI"]], outs: [[4, "HDMI"], [4, "SDI"], [1, "HDMI"]], source: "https://avlgear.com/collections/barco/products/barco-pds-4k-small-venue-uhd-4k-hdmi-12g-sdi-presentation-switcher", note: "12G-SDI. Last output is the multiviewer. There is also a card slot for other connectors or Dante audio." },
  { brand: "Barco", model: "EC-200", kind: "control", ins: [], outs: [[2, "Cat6"]], source: "https://www.audiogeneral.com/store/products/view/0602-2563", note: "Controller for the E2 and S3-4K. Two gigabit Ethernet ports. It has no video inputs, and 2 DVI outputs for monitors are not shown." },
  { brand: "Barco", model: "UDX-4K40", kind: "projector", ins: [[4, "SDI"], [1, "HDMI"], [1, "DisplayPort"], [1, "Cat6"]], outs: [], source: "https://shop.pssl.com/products/barco-udx-4k40-37-5k-4k-dlp-16-10-video-projector", note: "Quad 12G-SDI, HDMI 2.0, DisplayPort 1.2 and HDBaseT (shown as Cat6). Quad DisplayPort and fibre cards are optional." },
  { brand: "Barco", model: "Medea", kind: "projector", ins: [[2, "DVI"], [2, "DisplayPort"], [1, "HDMI"], [1, "Cat6"], [1, "SDI"]], outs: [], source: "https://www.barco.com/manuals/R5906140/k1rakqnjdj2p.html", note: "HDBaseT is shown as Cat6. SDI is 3G with 12G now supported." },
  { brand: "Barco", model: "F80-4K12", kind: "projector", ins: [[2, "DVI"], [1, "HDMI"], [1, "SDI"], [1, "Cat6"]], outs: [], source: "https://www.projectorcentral.com/Barco-F80-4K12.htm", note: "HDBaseT is shown as Cat6. SDI is a single HD-SDI input." },
  { brand: "Barco", model: "G100-W19", kind: "projector", ins: [[2, "HDMI"], [1, "DisplayPort"], [1, "DVI"], [1, "Cat6"], [1, "SDI"]], outs: [], source: "https://www.audiogeneral.com/store/products/view/0601-1452", note: "HDBaseT is shown as Cat6. Also has a VGA input, which is not shown." },
  { brand: "Barco", model: "G62-W14", kind: "projector", ins: [[2, "HDMI"], [1, "DVI"], [1, "Cat6"], [1, "SDI"]], outs: [], source: "https://fullcompass.com/prod/617830-barco-g62-w14-13600-wuxga-laser-projector-black-body-only", note: "HDBaseT is shown as Cat6. SDI is 3G." },
  { brand: "Barco", model: "I600-4K8", kind: "projector", ins: [[1, "HDMI"], [1, "DisplayPort"]], outs: [], source: "https://www.bhphotovideo.com/c/product/1911879-REG/barco_r9010811_i600_4k8_8000_lumen_uhd_4k.html", note: "HDMI 2.1 and DisplayPort 1.4 built in. One slot takes extra cards such as SDI, HDBaseT, fibre or quad DisplayPort." },
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
  { brand: "Generic", model: "Media PC (4 DisplayPort)", kind: "server", ins: [], outs: [[4, "DisplayPort"]], source: "", note: "For Resolume, Pixera, Watchout and similar. Change the outputs to match your graphics card." },
  { brand: "Generic", model: "Media server PC (4 HDMI)", kind: "server", ins: [], outs: [[4, "HDMI"]], source: "", note: "For Resolume, Pixera, Watchout and similar. Change the outputs to match your graphics card." },
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
