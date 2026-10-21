import { useState } from "react";
import { usage, type Lighting } from "../utils/lighting";
import { addNode, assignUniverses, fillIps, fmtArtnet, netChecks, netOf, patchNode, removeNode, sacnGroup, setNodePort, setPortCount, setProtocol } from "../utils/lightingNet";

/** Nodes, their IP addresses, switch ports and which universe each output sends. */
export default function Network({ l, onChange, flash }: { l: Lighting; onChange: (next: Lighting) => void; flash: (t: string) => void }) {
  const net = netOf(l);
  const [name, setName] = useState("");
  const [ports, setPorts] = useState(4);
  const [startIp, setStartIp] = useState("2.0.0.10");
  const checks = netChecks(l);
  const used = usage(l);
  const cell = "input !w-full !py-1";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 text-xs text-zinc-400">
        <label>
          Protocol
          <select className="input mt-1 !w-32 !py-1" value={net.protocol} onChange={(e) => onChange(setProtocol(l, e.target.value as "artnet" | "sacn"))}>
            <option value="artnet">Art-Net</option>
            <option value="sacn">sACN (E1.31)</option>
          </select>
        </label>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onChange(addNode(l, name, ports));
            setName("");
          }}
        >
          <label>
            New node
            <input className="input mt-1 !w-40 !py-1" placeholder="e.g. Stage left node" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Outputs
            <select className="input mt-1 !w-20 !py-1" value={ports} onChange={(e) => setPorts(Number(e.target.value))}>
              {[1, 2, 4, 6, 8, 12, 16].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn !px-3 !py-1.5 text-sm">
            Add node
          </button>
        </form>
        <button type="button" className="btn-primary !px-3 !py-1.5 text-sm" disabled={net.nodes.length === 0 || used.length === 0} onClick={() => (onChange(assignUniverses(l)), flash("Gave every universe an output, in order."))}>
          Assign universes
        </button>
        <span className="flex items-end gap-1">
          <label>
            First IP
            <input className="input mt-1 !w-32 !py-1" value={startIp} onChange={(e) => setStartIp(e.target.value)} />
          </label>
          <button type="button" className="btn !px-3 !py-1.5 text-sm" disabled={net.nodes.length === 0} onClick={() => (onChange(fillIps(l, startIp)), flash("Numbered the nodes one after another."))}>
            Fill IPs
          </button>
        </span>
      </div>

      {net.nodes.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
          No nodes yet. Add the Art-Net or sACN nodes your console sends to, then Assign universes to share the patch out across their outputs ({used.length} universe{used.length === 1 ? "" : "s"} in the patch now).
        </p>
      ) : (
        <div className="space-y-2">
          {net.nodes.map((x) => (
            <div key={x.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <div className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_1fr_auto]">
                <input className={cell} aria-label="Node name" value={x.name} onChange={(e) => onChange(patchNode(l, x.id, { name: e.target.value }))} />
                <input className={cell} aria-label="Node model" placeholder="Model (optional)" value={x.model} onChange={(e) => onChange(patchNode(l, x.id, { model: e.target.value }))} />
                <input className={`${cell} font-mono`} aria-label="IP address" placeholder="IP address" value={x.ip} onChange={(e) => onChange(patchNode(l, x.id, { ip: e.target.value }))} />
                <input className={cell} aria-label="Switch port" placeholder="Switch port" value={x.switchPort} onChange={(e) => onChange(patchNode(l, x.id, { switchPort: e.target.value }))} />
                <span className="flex items-center gap-1">
                  <select className="input !w-16 !py-1" aria-label="Number of outputs" value={x.ports.length} onChange={(e) => onChange(setPortCount(l, x.id, Number(e.target.value)))}>
                    {[...new Set([1, 2, 4, 6, 8, 12, 16, x.ports.length])].sort((a, b) => a - b).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn !px-2 !py-1 text-xs" onClick={() => onChange(removeNode(l, x.id))}>
                    Delete
                  </button>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {x.ports.map((u, i) => (
                  <label key={i} className="w-20 rounded-md border border-zinc-800 bg-zinc-900 p-1 text-center text-[11px] text-zinc-500">
                    Out {i + 1}
                    <input className="input mt-0.5 w-full !py-0.5 text-center" type="number" min={0} max={32768} value={u || ""} placeholder="–" aria-label={`${x.name} output ${i + 1} universe`} onChange={(e) => onChange(setNodePort(l, x.id, i, Number(e.target.value)))} />
                    <span className="block h-4 truncate font-mono text-zinc-400">{u ? (net.protocol === "artnet" ? fmtArtnet(u) : sacnGroup(u).replace("239.255.", "")) : ""}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs">
        <h3 className="mb-1 font-semibold text-zinc-300">Network checks{checks.length ? ` (${checks.length})` : ""}</h3>
        {checks.length === 0 ? (
          <p className="text-emerald-400">{net.nodes.length ? "Every universe has an output and no addresses clash." : "Add a node to start checking."}</p>
        ) : (
          <ul className="space-y-1">
            {checks.map((c, i) => (
              <li key={i} className={c.level === "error" ? "text-red-400" : "text-amber-400"}>
                {c.level === "error" ? "✕" : "!"} {c.text}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-zinc-500">{net.protocol === "artnet" ? "Under each output: Art-Net Net:Sub-Net:Universe. These count from 0, so universe 1 is 0:0:0." : "Under each output: the multicast group the universe goes to (239.255.x.y)."}</p>
      </div>
    </div>
  );
}
