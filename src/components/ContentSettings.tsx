import type { Content } from "../utils/content";
import type { Processor } from "../data/processors";
import { Field } from "./ui";

type Props = {
  content: Content;
  setContent: (c: Content) => void;
  processor: Processor | undefined;
  factor: number;
  effMaxPixels: number;
  effPixelsPerPort: number;
};

const bits = [8, 10, 12] as const;
const rates = [24, 25, 30, 50, 60, 100, 120];

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1 text-xs ${
    on ? "border-blue-500 bg-blue-950/50 text-zinc-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
  }`;

/** Bit depth and frame rate change how many pixels each port and the processor can carry. */
export default function ContentSettings({ content, setContent, processor, factor, effMaxPixels, effPixelsPerPort }: Props) {
  return (
    <div className="panel">
      <h2 className="panel-title">Signal</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Colour depth per channel">
          <div className="flex gap-1.5">
            {bits.map((b) => (
              <button key={b} type="button" aria-pressed={content.bitDepth === b} className={chip(content.bitDepth === b)} onClick={() => setContent({ ...content, bitDepth: b })}>
                {b}-bit
              </button>
            ))}
          </div>
        </Field>
        <Field label="Frame rate (Hz)">
          <div className="flex flex-wrap gap-1.5">
            {rates.map((r) => (
              <button key={r} type="button" aria-pressed={content.fps === r} className={chip(content.fps === r)} onClick={() => setContent({ ...content, fps: r })}>
                {r}
              </button>
            ))}
          </div>
        </Field>
      </div>
      {processor ? (
        <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
          <div>
            Capacity for this signal: <span className="font-semibold text-zinc-100">{(effMaxPixels / 1e6).toFixed(2)}M px</span> in total,{" "}
            <span className="font-semibold text-zinc-100">{Math.round(effPixelsPerPort / 1000)}K px</span> per port
            {factor < 0.999 && <span className="text-amber-300"> ({Math.round(factor * 100)}% of the 8-bit 60 Hz figure)</span>}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {processor.manufacturer === "Brompton"
              ? "Brompton rates its processors at 12-bit and 60 Hz, so colour depth does not lower the figure. Frame rates above 60 Hz do."
              : "Based on NovaStar's published figures: 650K per port at 8-bit, 480K at 10-bit and 325K at 12-bit, all at 60 Hz. Rates above 60 Hz are scaled down in proportion. Check your receiving card, as some cards cannot do 10-bit."}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Choose a processor to see how the signal changes its capacity.</p>
      )}
    </div>
  );
}
