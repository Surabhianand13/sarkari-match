import { chartToText, type ChartSpec } from "@/lib/chart";
import { RichTable } from "@/components/rich-text";
import { parseRichBlocks } from "@/lib/rich-text";

// Draws a bar, line or pie chart from its numbers. No chart library: plain SVG, so it works in server and client components.

const COLORS = ["#0b2d63", "#18b943", "#f59e0b", "#6366f1", "#0d9488", "#dc2626", "#7c3aed", "#64748b"];
const W = 480;
const H = 300;
const PAD = { left: 46, right: 14, top: 24, bottom: 52 };

const format = (value: number) => String(Math.round(value * 100) / 100);

// Round axis maximum and a step that gives four or five clean ticks.
export function niceScale(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 1, step: 0.25 };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? 10 * power;
  return { top: Math.ceil(max / step) * step, step };
}

function lines(label: string): string[] {
  if (label.length <= 9) return [label];
  const words = label.split(" ");
  if (words.length === 1) return [`${label.slice(0, 8)}…`];
  let first = words[0];
  let next = 1;
  while (next < words.length && `${first} ${words[next]}`.length <= 9) first += ` ${words[next++]}`;
  const second = words.slice(next).join(" ");
  return [first, second.length > 9 ? `${second.slice(0, 8)}…` : second].filter(Boolean);
}

function Axes({ chart, top, step }: { chart: ChartSpec; top: number; step: number }) {
  const innerH = H - PAD.top - PAD.bottom;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  return (
    <g>
      {ticks.map((tick) => {
        const y = PAD.top + innerH - (tick / top) * innerH;
        return (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#e4e7ec" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#667085">{format(tick)}</text>
          </g>
        );
      })}
      {chart.categories.map((category, index) => {
        const slot = (W - PAD.left - PAD.right) / chart.categories.length;
        const x = PAD.left + slot * index + slot / 2;
        return (
          <text key={category} x={x} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={11} fill="#344054">
            {lines(category).map((part, row) => <tspan key={row} x={x} dy={row === 0 ? 0 : 13}>{part}</tspan>)}
          </text>
        );
      })}
    </g>
  );
}

function Bars({ chart }: { chart: ChartSpec }) {
  const max = Math.max(...chart.series.flatMap((series) => series.values));
  const { top, step } = niceScale(max);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / chart.categories.length;
  const barW = Math.min(34, (slot * 0.78) / chart.series.length);
  const labels = chart.categories.length * chart.series.length <= 16;
  return (
    <>
      <Axes chart={chart} top={top} step={step} />
      {chart.series.map((series, s) =>
        series.values.map((value, c) => {
          const height = (value / top) * innerH;
          const x = PAD.left + slot * c + slot / 2 - (barW * chart.series.length) / 2 + barW * s;
          const y = PAD.top + innerH - height;
          return (
            <g key={`${s}-${c}`}>
              <rect x={x} y={y} width={barW - 2} height={height} rx={2} fill={COLORS[s % COLORS.length]} />
              {labels && <text x={x + (barW - 2) / 2} y={y - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#111827">{format(value)}</text>}
            </g>
          );
        })
      )}
    </>
  );
}

function LinePlot({ chart }: { chart: ChartSpec }) {
  const max = Math.max(...chart.series.flatMap((series) => series.values));
  const { top, step } = niceScale(max);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / chart.categories.length;
  const labels = chart.categories.length * chart.series.length <= 16;
  return (
    <>
      <Axes chart={chart} top={top} step={step} />
      {chart.series.map((series, s) => {
        const points = series.values.map((value, c) => ({ x: PAD.left + slot * c + slot / 2, y: PAD.top + innerH - (value / top) * innerH, value }));
        return (
          <g key={s}>
            <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={COLORS[s % COLORS.length]} strokeWidth={2.5} />
            {points.map((p, c) => (
              <g key={c}>
                <circle cx={p.x} cy={p.y} r={4} fill={COLORS[s % COLORS.length]} />
                {labels && <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill="#111827">{format(p.value)}</text>}
              </g>
            ))}
          </g>
        );
      })}
    </>
  );
}

function Pie({ chart }: { chart: ChartSpec }) {
  const values = chart.series[0].values;
  const total = values.reduce((sum, value) => sum + value, 0);
  const cx = 130;
  const cy = H / 2 - 6;
  const r = 100;
  let angle = -Math.PI / 2;
  return (
    <>
      {values.map((value, index) => {
        const sweep = (value / total) * Math.PI * 2;
        const start = angle;
        angle += sweep;
        const color = COLORS[index % COLORS.length];
        if (values.length === 1 || sweep >= Math.PI * 2 - 1e-6) return <circle key={index} cx={cx} cy={cy} r={r} fill={color} />;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        const mid = start + sweep / 2;
        return (
          <g key={index}>
            <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`} fill={color} stroke="#fff" strokeWidth={2} />
            {sweep > 0.28 && <text x={cx + r * 0.62 * Math.cos(mid)} y={cy + r * 0.62 * Math.sin(mid) + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff">{format((value / total) * 100)}%</text>}
          </g>
        );
      })}
      {chart.categories.map((category, index) => (
        <g key={category} transform={`translate(262 ${34 + index * 26})`}>
          <rect width={14} height={14} rx={3} fill={COLORS[index % COLORS.length]} />
          <text x={22} y={12} fontSize={12} fill="#111827"><tspan fontWeight={700}>{category}</tspan> {format(values[index])}{chart.unit ? ` ${chart.unit}` : ""}</text>
        </g>
      ))}
    </>
  );
}

export function Chart({ chart }: { chart: ChartSpec }) {
  const summary = `${chart.title}. ${chartToText(chart).split("\n").slice(1).join(" ")}`;
  const crowded = chart.type !== "pie" && chart.categories.length * chart.series.length > 16;
  const tableBlock = crowded ? parseRichBlocks(chartToText(chart)).find((block) => block.type === "table") : undefined;
  return (
    <figure className="my-3 rounded-2xl border border-border bg-white p-3">
      <figcaption className="mb-1 text-center text-sm font-black text-primary">
        {chart.title}
        {chart.unit && chart.type !== "pie" ? <span className="font-semibold text-muted"> ({chart.unit})</span> : null}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="mx-auto block h-auto w-full max-w-xl">
        {chart.type === "bar" && <Bars chart={chart} />}
        {chart.type === "line" && <LinePlot chart={chart} />}
        {chart.type === "pie" && <Pie chart={chart} />}
      </svg>
      {chart.type !== "pie" && chart.series.length > 1 && (
        <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-bold text-foreground">
          {chart.series.map((series, index) => (
            <li key={series.name} className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm" style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true" />{series.name}</li>
          ))}
        </ul>
      )}
      {tableBlock && tableBlock.type === "table" && <RichTable block={tableBlock} />}
    </figure>
  );
}
