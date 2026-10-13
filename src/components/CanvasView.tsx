import { colourFor } from "./CabinetMap";
import type { CanvasPlan } from "../utils/canvas";
import type { DataPlan } from "../utils/dataPlan";

/** The wall's pixel canvas, with each data port's area outlined. */
export default function CanvasView({ canvas, dataPlan }: { canvas: CanvasPlan; dataPlan: DataPlan }) {
  const pad = 40;
  const maxW = 900;
  const scale = maxW / Math.max(canvas.width, 1);
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  const cut = new Set(canvas.cutOut.map(([r, c]) => `${r},${c}`));

  return (
    <svg
      viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`}
      className="w-full"
      role="img"
      aria-label={`Pixel canvas ${canvas.width} by ${canvas.height}`}
    >
      <text x={pad} y={pad - 14} fontSize={12} fill="#8b97a3">
        0, 0
      </text>
      <text x={pad + w} y={pad - 14} fontSize={12} fill="#8b97a3" textAnchor="end">
        {canvas.width} px
      </text>
      <text x={pad - 8} y={pad + h} fontSize={12} fill="#8b97a3" textAnchor="end">
        {canvas.height}
      </text>

      <rect x={pad} y={pad} width={w} height={h} fill="#12171c" stroke="#3b4652" />

      {Array.from({ length: canvas.high }).map((_, r) =>
        Array.from({ length: canvas.wide }).map((__, c) => {
          if (cut.has(`${r},${c}`)) return null;
          const port = dataPlan.map[r]?.[c]?.port ?? 0;
          const colour = port > 0 ? colourFor(port) : "#8b97a3";
          return (
            <rect
              key={`${r},${c}`}
              x={pad + canvas.colX[c] * scale}
              y={pad + canvas.rowY[r] * scale}
              width={(canvas.colX[c + 1] - canvas.colX[c]) * scale}
              height={(canvas.rowY[r + 1] - canvas.rowY[r]) * scale}
              fill={colour}
              fillOpacity={0.22}
              stroke={colour}
              strokeOpacity={0.55}
              strokeWidth={0.8}
            />
          );
        })
      )}

      {canvas.ports.map((p) => {
        const colour = colourFor(p.port);
        return (
          <g key={p.port}>
            <rect
              x={pad + p.x * scale}
              y={pad + p.y * scale}
              width={p.w * scale}
              height={p.h * scale}
              fill="none"
              stroke={colour}
              strokeWidth={1.6}
              strokeDasharray="6 4"
            />
            <text
              x={pad + p.x * scale + 5}
              y={pad + p.y * scale + 15}
              fontSize={13}
              fontWeight={700}
              fill={colour}
            >
              P{p.port}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
