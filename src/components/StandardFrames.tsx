import { fitText, frameReport, exactFrame } from "../utils/videoFrames";

/** How a canvas compares with the standard video frames a media server outputs. */
export default function StandardFrames({ width, height, label = "Canvas" }: { width: number; height: number; label?: string }) {
  if (width <= 0 || height <= 0) return null;
  const { fits, smallest } = frameReport(width, height);
  const exact = exactFrame(width, height);
  return (
    <div className="panel">
      <h2 className="panel-title">Standard video frames</h2>
      <p className="mb-3 text-sm text-zinc-300">
        {label} is {width} x {height} px.{" "}
        {exact
          ? `That is exactly ${exact.name}.`
          : smallest
          ? `The smallest standard frame that holds it is ${smallest.frame.name} (${smallest.frame.width} x ${smallest.frame.height}).`
          : "It is bigger than any single standard frame, so it needs several outputs."}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="py-2 pr-4">Frame</th>
              <th className="pr-4">Size</th>
              <th>Your canvas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {fits.map((f) => (
              <tr key={f.frame.id} className={smallest?.frame.id === f.frame.id ? "bg-blue-500/10" : undefined}>
                <td className="py-2 pr-4">
                  <span className="font-semibold">{f.frame.name}</span>
                  <span className="block text-xs text-zinc-500">{f.frame.standard}</span>
                </td>
                <td className="pr-4 whitespace-nowrap">
                  {f.frame.width} x {f.frame.height}
                </td>
                <td className={f.fits ? "text-emerald-300" : "text-zinc-300"}>{fitText(f)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Outputs counted without scaling, one pixel of your wall per pixel of the frame. Frame sizes are the picture sizes from the SMPTE documents shown.
      </p>
    </div>
  );
}
