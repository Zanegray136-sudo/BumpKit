import { csvCell, usage, type Lighting, type Net, type NetNode } from "./lighting";

export const netOf = (l: Lighting): Net => l.net ?? { protocol: "artnet", nodes: [] };
const withNet = (l: Lighting, net: Net): Lighting => ({ ...l, net });
const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function setProtocol(l: Lighting, protocol: Net["protocol"]): Lighting {
  return withNet(l, { ...netOf(l), protocol });
}

export function addNode(l: Lighting, name: string, ports: number, model = ""): Lighting {
  const n = netOf(l);
  const count = Math.max(1, Math.min(64, Math.round(ports) || 1));
  const node: NetNode = { id: newId(), name: name.trim().slice(0, 60) || `Node ${n.nodes.length + 1}`, model: model.trim().slice(0, 80), ip: "", switchPort: "", ports: Array(count).fill(0), note: "" };
  return withNet(l, { ...n, nodes: [...n.nodes, node].slice(0, 200) });
}

export function patchNode(l: Lighting, id: string, patch: Partial<Omit<NetNode, "id">>): Lighting {
  const n = netOf(l);
  return withNet(l, { ...n, nodes: n.nodes.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
}

export function removeNode(l: Lighting, id: string): Lighting {
  const n = netOf(l);
  return withNet(l, { ...n, nodes: n.nodes.filter((x) => x.id !== id) });
}

export function setPortCount(l: Lighting, id: string, count: number): Lighting {
  const c = Math.max(1, Math.min(64, Math.round(count) || 1));
  const n = netOf(l);
  return withNet(l, { ...n, nodes: n.nodes.map((x) => (x.id === id ? { ...x, ports: Array.from({ length: c }, (_, i) => x.ports[i] ?? 0) } : x)) });
}

export function setNodePort(l: Lighting, id: string, port: number, universe: number): Lighting {
  const n = netOf(l);
  const u = Math.max(0, Math.min(32768, Math.round(universe) || 0));
  return withNet(l, { ...n, nodes: n.nodes.map((x) => (x.id === id ? { ...x, ports: x.ports.map((p, i) => (i === port ? u : p)) } : x)) });
}

/** Gives every universe the patch uses an output, filling the nodes in order. Spare outputs are cleared. */
export function assignUniverses(l: Lighting): Lighting {
  const used = usage(l).map((u) => u.universe).sort((a, b) => a - b);
  const n = netOf(l);
  let k = 0;
  return withNet(l, { ...n, nodes: n.nodes.map((x) => ({ ...x, ports: x.ports.map(() => used[k++] ?? 0) })) });
}

export const validIp = (s: string) => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s) && s.split(".").every((p) => Number(p) <= 255);

/** Numbers the nodes from a first address, one after another. Stops at .254 of the last block. */
export function fillIps(l: Lighting, start: string): Lighting {
  if (!validIp(start)) return l;
  const base = start.split(".").map(Number);
  const n = netOf(l);
  return withNet(l, {
    ...n,
    nodes: n.nodes.map((x, i) => {
      const last = base[3] + i;
      return last > 254 ? x : { ...x, ip: `${base[0]}.${base[1]}.${base[2]}.${last}` };
    }),
  });
}

/** Art-Net 4 addresses are 0-based: 15 bits split into Net (7), Sub-Net (4) and Universe (4). */
export function artnetAddress(universe: number): { net: number; sub: number; uni: number } {
  const u = Math.max(0, universe - 1);
  return { net: (u >> 8) & 127, sub: (u >> 4) & 15, uni: u & 15 };
}
export const fmtArtnet = (universe: number) => {
  const a = artnetAddress(universe);
  return `${a.net}:${a.sub}:${a.uni}`;
};
/** The multicast group an sACN universe is sent to. */
export const sacnGroup = (universe: number) => `239.255.${(universe >> 8) & 255}.${universe & 255}`;

export type NetCheck = { level: "error" | "warn"; text: string };

export function netChecks(l: Lighting): NetCheck[] {
  const n = netOf(l);
  const out: NetCheck[] = [];
  const ips = new Map<string, string[]>();
  const owners = new Map<number, string[]>();
  for (const x of n.nodes) {
    if (!x.ip.trim()) out.push({ level: "warn", text: `${x.name} has no IP address.` });
    else if (!validIp(x.ip.trim())) out.push({ level: "error", text: `${x.name} has an IP that is not valid (${x.ip}).` });
    else ips.set(x.ip.trim(), [...(ips.get(x.ip.trim()) ?? []), x.name]);
    x.ports.forEach((u) => u && owners.set(u, [...(owners.get(u) ?? []), x.name]));
  }
  for (const [ip, names] of ips) if (names.length > 1) out.push({ level: "error", text: `${names.join(" and ")} share the IP ${ip}.` });
  for (const [u, names] of owners) if (names.length > 1) out.push({ level: "warn", text: `Universe ${u} is sent from ${names.length} outputs (${names.join(", ")}). That is fine for mirroring, not for two different rigs.` });
  const subnets = new Set([...ips.keys()].map((ip) => ip.split(".").slice(0, 3).join(".")));
  if (n.protocol === "artnet" && subnets.size > 1) out.push({ level: "warn", text: `The nodes are on ${subnets.size} different networks (${[...subnets].map((s) => s + ".x").join(", ")}). Check they can reach each other.` });
  const used = usage(l).map((u) => u.universe);
  for (const u of used) if (!owners.has(u)) out.push({ level: n.nodes.length ? "error" : "warn", text: `Universe ${u} is in the patch but no node output sends it.` });
  for (const x of n.nodes) {
    const empty = x.ports.filter((u) => !u).length;
    if (empty === x.ports.length && x.ports.length > 0) out.push({ level: "warn", text: `${x.name} has no universes on its outputs.` });
  }
  if (n.protocol === "sacn" && used.length > 63) out.push({ level: "warn", text: "Over 63 universes of sACN multicast is hard on a switch without IGMP snooping." });
  return out;
}

export function netRows(l: Lighting): string[][] {
  const n = netOf(l);
  const rows: string[][] = [];
  for (const x of n.nodes) {
    x.ports.forEach((u, i) => {
      rows.push([x.name, x.model, x.ip, x.switchPort, String(i + 1), u ? String(u) : "", u ? (n.protocol === "artnet" ? fmtArtnet(u) : sacnGroup(u)) : "", x.note]);
    });
  }
  return rows;
}
export const netHeader = ["Node", "Model", "IP", "Switch port", "Output", "Universe", "Art-Net net:sub:uni or sACN group", "Notes"];

export const netCsv = (l: Lighting) => [netHeader, ...netRows(l)].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
