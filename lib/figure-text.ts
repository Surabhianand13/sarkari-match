import type { FigureSpec, GeometryFigure, VennFigure } from "@/lib/figure";

// The parts of figure handling that the browser needs to draw a figure. Kept apart from lib/figure.ts, which carries the
// validation library, so learners' pages do not download it.

export const vennKeys = {
  2: ["1", "2", "12"],
  3: ["1", "2", "3", "12", "13", "23", "123"]
} as const;

export function vennRegionName(figure: VennFigure, key: string): string {
  if (key === "none") return "Outside all the sets";
  const names = key.split("").map((digit) => figure.sets[Number(digit) - 1]);
  if (names.length === 1) return `Only ${names[0]}`;
  if (names.length === figure.sets.length) return figure.sets.length === 2 ? `In both ${names.join(" and ")}` : `In all three (${names.join(", ")})`;
  return `${names.join(" and ")} only`;
}

// The figure as plain text: what the solver and reviewer read, and what a screen reader gets.
export function figureToText(figure: FigureSpec): string {
  if (figure.type === "venn") {
    const order = [...vennKeys[figure.sets.length as 2 | 3], "none"].filter((key) => key in figure.counts);
    return [
      `Venn diagram${figure.title ? `: ${figure.title}` : ""}`,
      `Sets: ${figure.sets.join(", ")}`,
      ...order.map((key) => `${vennRegionName(figure, key)}: ${figure.counts[key] === null ? "? (unknown, to be found)" : figure.counts[key]}`)
    ].join("\n");
  }
  const lines = figure.lines.map((line) => `${line.from}${line.to}${line.label ? ` = ${line.label}` : ""}`);
  const circles = figure.circles.map((circle) => `circle with centre ${circle.center}${circle.label ? ` (${circle.label})` : ""}`);
  const angles = figure.angles.map((angle) => `∠${angle.from}${angle.at}${angle.to} = ${angle.label}`);
  return [
    `Geometry figure${figure.title ? `: ${figure.title}` : ""} (not drawn to scale)`,
    `Points: ${figure.points.map((point) => point.name).join(", ")}`,
    lines.length ? `Lines: ${lines.join("; ")}` : "",
    circles.length ? `Circles: ${circles.join("; ")}` : "",
    angles.length ? `Angles: ${angles.join("; ")}` : ""
  ].filter(Boolean).join("\n");
}

// The angle drawn at a vertex, in degrees.
export function drawnAngle(figure: GeometryFigure, angle: GeometryFigure["angles"][number]): number | null {
  const at = figure.points.find((point) => point.name === angle.at);
  const from = figure.points.find((point) => point.name === angle.from);
  const to = figure.points.find((point) => point.name === angle.to);
  if (!at || !from || !to) return null;
  const a = Math.atan2(from.y - at.y, from.x - at.x);
  const b = Math.atan2(to.y - at.y, to.x - at.x);
  let delta = Math.abs(a - b);
  if (delta > Math.PI) delta = 2 * Math.PI - delta;
  return (delta * 180) / Math.PI;
}
