import { z } from "zod";
import { drawnAngle, vennKeys } from "@/lib/figure-text";

// Re-exported so server code can keep importing everything about figures from here.
export { drawnAngle, figureToText, vennRegionName } from "@/lib/figure-text";

// A figure is stored as a description, never as a picture. The site draws it, and the independent solver and reviewer, who
// cannot see a drawing, are given the same description as text. Two kinds: a Venn diagram (sets and counts) and geometry
// (labelled points, lines, circles and angles). Anything else a learner would have to see stays blocked.

const label = z.string().trim().min(1).max(24);
const pointName = z.string().trim().regex(/^[A-Za-z][A-Za-z0-9']{0,2}$/, "Point names are one to three characters, such as A, B or O1.");

const vennSchema = z.object({
  type: z.literal("venn"),
  title: z.string().trim().max(120).optional(),
  // Two or three set names. In "counts", "1" is only the first set, "12" is the first and second only, "123" is all three, "none" is outside every set.
  sets: z.array(z.string().trim().min(1).max(20)).min(2).max(3),
  counts: z.record(z.string(), z.number().int().min(0).max(1_000_000).nullable())
});

const geometrySchema = z.object({
  type: z.literal("geometry"),
  title: z.string().trim().max(120).optional(),
  // x runs left to right and y bottom to top, both from 0 to 100. Only the shape matters: the figure is shown as not to scale.
  points: z.array(z.object({ name: pointName, x: z.number().min(0).max(100), y: z.number().min(0).max(100) })).min(2).max(10),
  lines: z.array(z.object({ from: pointName, to: pointName, label: label.optional() })).max(16).default([]),
  circles: z.array(z.object({ center: pointName, radius: z.number().min(2).max(60), label: label.optional() })).max(3).default([]),
  angles: z.array(z.object({ at: pointName, from: pointName, to: pointName, label: z.string().trim().min(1).max(12) })).max(6).default([])
});

export const figureSpecSchema = z.discriminatedUnion("type", [vennSchema, geometrySchema]).superRefine((figure, ctx) => {
  const fail = (message: string, path: string[]) => ctx.addIssue({ code: "custom", message, path });
  if (figure.type === "venn") {
    // The shape check above already reported a wrong number of sets; without one there are no regions to check.
    const allowed: readonly string[] | undefined = vennKeys[figure.sets.length as 2 | 3];
    if (!allowed) return;
    if (new Set(figure.sets.map((name) => name.toLowerCase())).size !== figure.sets.length) fail("Set names must all be different.", ["sets"]);
    for (const key of Object.keys(figure.counts)) if (!allowed.includes(key) && key !== "none") fail(`"${key}" is not a region of a ${figure.sets.length}-set Venn diagram.`, ["counts"]);
    for (const key of allowed) if (!(key in figure.counts)) fail(`Give a count for region "${key}" (use null for the unknown one).`, ["counts"]);
    if (Object.values(figure.counts).filter((value) => value === null).length > 2) fail("At most two regions can be unknown.", ["counts"]);
    return;
  }
  const names = figure.points.map((point) => point.name);
  if (new Set(names).size !== names.length) fail("Point names must all be different.", ["points"]);
  const known = new Set(names);
  for (const line of figure.lines) {
    if (!known.has(line.from) || !known.has(line.to)) fail(`The line ${line.from}${line.to} uses a point that is not listed.`, ["lines"]);
    if (line.from === line.to) fail("A line needs two different points.", ["lines"]);
  }
  const pairs = figure.lines.map((line) => [line.from, line.to].sort().join("-"));
  if (new Set(pairs).size !== pairs.length) fail("The same line is listed twice.", ["lines"]);
  for (const circle of figure.circles) if (!known.has(circle.center)) fail(`The circle's centre ${circle.center} is not a listed point.`, ["circles"]);
  for (const angle of figure.angles) {
    if (![angle.at, angle.from, angle.to].every((name) => known.has(name))) fail(`The angle at ${angle.at} uses a point that is not listed.`, ["angles"]);
    if (new Set([angle.at, angle.from, angle.to]).size !== 3) fail("An angle needs three different points.", ["angles"]);
  }
  if (!figure.lines.length && !figure.circles.length) fail("A geometry figure needs at least one line or circle.", ["lines"]);
  const close = figure.points.some((a, i) => figure.points.some((b, j) => j > i && Math.hypot(a.x - b.x, a.y - b.y) < 3));
  if (close) fail("Two points are drawn on top of each other. Spread the points out.", ["points"]);
});

export type FigureSpec = z.infer<typeof figureSpecSchema>;
export type VennFigure = Extract<FigureSpec, { type: "venn" }>;
export type GeometryFigure = Extract<FigureSpec, { type: "geometry" }>;

export function parseFigure(input: unknown): { figure: FigureSpec } | { error: string } {
  const result = figureSpecSchema.safeParse(input);
  return result.success ? { figure: result.data } : { error: result.error.issues.map((issue) => issue.message).join(" ") };
}

// A stored figure, or null when it is missing or no longer valid.
export function toFigure(input: unknown): FigureSpec | null {
  if (!input) return null;
  const parsed = parseFigure(input);
  return "figure" in parsed ? parsed.figure : null;
}

// Every number a learner can read off the figure, used to check that a question's working really uses it.
export function figureNumbers(figure: FigureSpec): number[] {
  const fromText = (text: string | undefined) => (text ? (text.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? []).map(Number) : []);
  if (figure.type === "venn") return Object.values(figure.counts).filter((value): value is number => value !== null);
  return [...figure.lines.flatMap((line) => fromText(line.label)), ...figure.circles.flatMap((circle) => fromText(circle.label)), ...figure.angles.flatMap((angle) => fromText(angle.label))];
}

export const ANGLE_TOLERANCE_DEGREES = 25;

// The drawing is not to scale, but an angle labelled 90° must not be drawn as 50°. Returns why the drawing would mislead, or null.
export function figureConsistencyProblem(figure: FigureSpec): string | null {
  if (figure.type !== "geometry") return null;
  for (const angle of figure.angles) {
    const labelled = /^(\d+(?:\.\d+)?)\s*°?$/.exec(angle.label.trim());
    if (!labelled) continue;
    const drawn = drawnAngle(figure, angle);
    if (drawn !== null && Math.abs(drawn - Number(labelled[1])) > ANGLE_TOLERANCE_DEGREES) {
      return `∠${angle.from}${angle.at}${angle.to} is labelled ${angle.label} but drawn as about ${Math.round(drawn)}°. Move the points so the drawing is close to the labelled angle (within ${ANGLE_TOLERANCE_DEGREES}°).`;
    }
  }
  return null;
}
