import { useMemo, useRef, useState } from "react";

export type TrendPoint = { label: string; value: number };

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 30, left: 42 };

function niceBounds(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const pad = span * 0.25;
  const min = Math.floor((lo - pad) * 2) / 2;
  const max = Math.ceil((hi + pad) * 2) / 2;
  return { min, max };
}

export function TrendChart({
  data,
  unit = "%",
}: {
  data: TrendPoint[];
  unit?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { min, max } = useMemo(() => niceBounds(data.map((d) => d.value)), [data]);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${PAD.left},${PAD.top + plotH} ${line} ${PAD.left + plotW},${PAD.top + plotH}`;

  const ticks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, i) => min + ((max - min) * i) / count);
  }, [min, max]);

  const active = hover === null ? null : data[hover];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = (px - PAD.left) / plotW;
    const idx = Math.round(ratio * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, idx)));
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Composite quality trend"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={i === 0 ? undefined : "3 4"}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 10 }}
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + plotH}
          stroke="var(--border)"
          strokeWidth="1"
        />

        <polyline points={area} fill="url(#trend-fill)" stroke="none" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => (
          <text
            key={d.label}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9.5 }}
          >
            {d.label}
          </text>
        ))}

        {data.map((d, i) => (
          <circle
            key={`p-${d.label}`}
            cx={x(i)}
            cy={y(d.value)}
            r={hover === i ? 4.5 : 2.5}
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth="2"
          />
        ))}

        {active && hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--primary)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />
        )}
      </svg>

      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="font-medium tabular-nums">
            {active.value.toFixed(1)}
            {unit}
          </div>
          <div className="text-[10px] text-muted-foreground">{active.label}</div>
        </div>
      )}
    </div>
  );
}
