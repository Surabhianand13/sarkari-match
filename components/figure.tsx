import type { FigureSpec, GeometryFigure, VennFigure } from "@/lib/figure";
import { drawnAngle, figureToText } from "@/lib/figure-text";

// Draws a Venn or geometry figure from its description. Plain SVG, so it works in server and client components.

const COLORS = ["#0b2d63", "#18b943", "#f59e0b"];
const W = 480;
const H = 300;

const show = (value: number | null) => (value === null ? "?" : String(value));

type Spot = { x: number; y: number };

const VENN_LAYOUT: Record<2 | 3, { circles: Array<Spot & { r: number }>; names: Array<Spot & { anchor?: "start" | "middle" | "end" }>; regions: Record<string, Spot> }> = {
  2: {
    circles: [{ x: 175, y: 160, r: 100 }, { x: 305, y: 160, r: 100 }],
    names: [{ x: 140, y: 38 }, { x: 340, y: 38 }],
    regions: { "1": { x: 130, y: 165 }, "2": { x: 350, y: 165 }, "12": { x: 240, y: 165 } }
  },
  3: {
    circles: [{ x: 195, y: 118, r: 85 }, { x: 285, y: 118, r: 85 }, { x: 240, y: 196, r: 85 }],
    names: [{ x: 120, y: 24 }, { x: 360, y: 24 }, { x: 150, y: 272, anchor: "end" }],
    regions: { "1": { x: 155, y: 105 }, "2": { x: 325, y: 105 }, "3": { x: 240, y: 252 }, "12": { x: 240, y: 82 }, "13": { x: 197, y: 172 }, "23": { x: 283, y: 172 }, "123": { x: 240, y: 140 } }
  }
};

function Venn({ figure }: { figure: VennFigure }) {
  const layout = VENN_LAYOUT[figure.sets.length as 2 | 3];
  const count = (key: string) => (key in figure.counts ? figure.counts[key] : undefined);
  return (
    <>
      <rect x={6} y={6} width={W - 12} height={H - 12} rx={10} fill="none" stroke="#98a2b3" strokeWidth={1.5} />
      {layout.circles.map((circle, index) => (
        <circle key={index} cx={circle.x} cy={circle.y} r={circle.r} fill={COLORS[index]} fillOpacity={0.18} stroke={COLORS[index]} strokeWidth={2.5} />
      ))}
      {figure.sets.map((name, index) => (
        <text key={name} x={layout.names[index].x} y={layout.names[index].y} textAnchor={layout.names[index].anchor ?? "middle"} fontSize={14} fontWeight={800} fill={COLORS[index]}>{name}</text>
      ))}
      {Object.entries(layout.regions).map(([key, spot]) => {
        const value = count(key);
        if (value === undefined) return null;
        return <text key={key} x={spot.x} y={spot.y + 5} textAnchor="middle" fontSize={17} fontWeight={800} fill={value === null ? "#b45309" : "#111827"}>{show(value)}</text>;
      })}
      {count("none") !== undefined && (
        <text x={W - 20} y={H - 18} textAnchor="end" fontSize={14} fontWeight={800} fill={count("none") === null ? "#b45309" : "#111827"}>
          <tspan fontSize={11} fontWeight={600} fill="#667085">Outside: </tspan>{show(count("none") ?? null)}
        </text>
      )}
    </>
  );
}

function Geometry({ figure }: { figure: GeometryFigure }) {
  const pad = 46;
  const circleBoxes = figure.circles.flatMap((circle) => {
    const centre = figure.points.find((point) => point.name === circle.center);
    return centre ? [{ x: centre.x - circle.radius, y: centre.y - circle.radius }, { x: centre.x + circle.radius, y: centre.y + circle.radius }] : [];
  });
  const all = [...figure.points, ...circleBoxes];
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const width = Math.max(maxX - minX, 10);
  const height = Math.max(maxY - minY, 10);
  const scale = Math.min((W - pad * 2) / width, (H - pad * 2) / height);
  const offX = (W - width * scale) / 2;
  const offY = (H - height * scale) / 2;
  const sx = (x: number) => offX + (x - minX) * scale;
  const sy = (y: number) => H - offY - (y - minY) * scale;
  const at = (name: string) => {
    const point = figure.points.find((item) => item.name === name)!;
    return { x: sx(point.x), y: sy(point.y) };
  };
  const centroid = { x: figure.points.reduce((sum, p) => sum + sx(p.x), 0) / figure.points.length, y: figure.points.reduce((sum, p) => sum + sy(p.y), 0) / figure.points.length };
  const away = (spot: Spot, distance: number) => {
    const dx = spot.x - centroid.x;
    const dy = spot.y - centroid.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: spot.x + (dx / length) * distance, y: spot.y + (dy / length) * distance };
  };

  return (
    <>
      {figure.circles.map((circle, index) => {
        const centre = at(circle.center);
        const r = circle.radius * scale;
        return (
          <g key={`c${index}`}>
            <circle cx={centre.x} cy={centre.y} r={r} fill="none" stroke="#0b2d63" strokeWidth={2} />
            {circle.label && <text x={centre.x + (r + 6) * Math.SQRT1_2} y={centre.y - (r + 6) * Math.SQRT1_2} textAnchor="start" fontSize={13} fontWeight={700} fill="#344054">{circle.label}</text>}
          </g>
        );
      })}
      {figure.lines.map((line, index) => {
        const a = at(line.from);
        const b = at(line.to);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        // Push the length label to the outer side of the line.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy) || 1;
        let nx = -dy / length;
        let ny = dx / length;
        if ((mid.x - centroid.x) * nx + (mid.y - centroid.y) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        return (
          <g key={`l${index}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0b2d63" strokeWidth={2.2} strokeLinecap="round" />
            {line.label && (
              // On a steep line the label sits beside it, anchored away from the line; on a flat line it sits above or below.
              <text x={mid.x + nx * 9} y={mid.y + ny * (Math.abs(nx) > 0.5 ? 0 : 15) + 4} textAnchor={Math.abs(nx) > 0.5 ? (nx < 0 ? "end" : "start") : "middle"} fontSize={13} fontWeight={700} fill="#344054">{line.label}</text>
            )}
          </g>
        );
      })}
      {figure.angles.map((angle, index) => {
        const vertex = at(angle.at);
        const from = at(angle.from);
        const to = at(angle.to);
        const a1 = Math.atan2(from.y - vertex.y, from.x - vertex.x);
        const a2 = Math.atan2(to.y - vertex.y, to.x - vertex.x);
        let delta = a2 - a1;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        const drawn = drawnAngle(figure, angle) ?? 0;
        const right = /^90\s*°?$/.test(angle.label.trim()) && Math.abs(drawn - 90) < 12;
        if (right) {
          const size = 12;
          const u = { x: Math.cos(a1), y: Math.sin(a1) };
          const v = { x: Math.cos(a2), y: Math.sin(a2) };
          const p1 = { x: vertex.x + u.x * size, y: vertex.y + u.y * size };
          const p2 = { x: vertex.x + (u.x + v.x) * size, y: vertex.y + (u.y + v.y) * size };
          const p3 = { x: vertex.x + v.x * size, y: vertex.y + v.y * size };
          return <polyline key={`a${index}`} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill="none" stroke="#f59e0b" strokeWidth={2} />;
        }
        const r = 22;
        const start = { x: vertex.x + r * Math.cos(a1), y: vertex.y + r * Math.sin(a1) };
        const end = { x: vertex.x + r * Math.cos(a2), y: vertex.y + r * Math.sin(a2) };
        const middle = a1 + delta / 2;
        return (
          <g key={`a${index}`}>
            <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${end.x} ${end.y}`} fill="none" stroke="#f59e0b" strokeWidth={2} />
            <text x={vertex.x + (r + 18) * Math.cos(middle)} y={vertex.y + (r + 18) * Math.sin(middle) + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#b45309">{angle.label}</text>
          </g>
        );
      })}
      {figure.points.map((point) => {
        const spot = { x: sx(point.x), y: sy(point.y) };
        const label = away(spot, 15);
        return (
          <g key={point.name}>
            <circle cx={spot.x} cy={spot.y} r={3.2} fill="#0b2d63" />
            <text x={label.x} y={label.y + 5} textAnchor="middle" fontSize={15} fontWeight={800} fill="#111827">{point.name}</text>
          </g>
        );
      })}
    </>
  );
}

export function Figure({ figure }: { figure: FigureSpec }) {
  return (
    <figure className="my-3 rounded-2xl border border-border bg-white p-3">
      {figure.title && <figcaption className="mb-1 text-center text-sm font-black text-primary">{figure.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureToText(figure).replace(/\n/g, ". ")} className="mx-auto block h-auto w-full max-w-md">
        {figure.type === "venn" ? <Venn figure={figure} /> : <Geometry figure={figure} />}
      </svg>
      {figure.type === "geometry" && <p className="mt-1 text-center text-xs font-semibold text-muted">Not drawn to scale</p>}
    </figure>
  );
}
