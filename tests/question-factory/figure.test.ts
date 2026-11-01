import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Figure } from "@/components/figure";
import { figureSeed } from "@/lib/figure-seed";
import { drawnAngle, figureConsistencyProblem, figureNumbers, figureToText, parseFigure, toFigure, type FigureSpec, type GeometryFigure } from "@/lib/figure";
import { checkQuestionImage } from "@/lib/question-images";
import { figureProblem } from "@/lib/rich-text";
import { runCodeValidation } from "@/lib/question-factory/validator";
import { summariseChecks } from "@/lib/question-factory/checks-summary";
import { questionDraftSchema } from "@/lib/tests/question-schema";

function fig(input: unknown): FigureSpec & GeometryFigure & { counts: Record<string, number | null> } {
  const parsed = parseFigure(input);
  if (!("figure" in parsed)) throw new Error(parsed.error);
  return parsed.figure as never;
}

const venn2 = { type: "venn", title: "Sports club", sets: ["Cricket", "Football"], counts: { "1": 12, "2": 8, "12": 5, none: 4 } };
const venn3 = { type: "venn", sets: ["Tea", "Coffee", "Milk"], counts: { "1": 10, "2": 8, "3": 6, "12": 4, "13": 3, "23": 2, "123": 1, none: null } };

// Right angle at B, 35 degrees at A: BC = AB * tan 35 so the drawing matches its labels.
const triangle = {
  type: "geometry",
  points: [{ name: "A", x: 10, y: 60 }, { name: "B", x: 10, y: 10 }, { name: "C", x: 45, y: 10 }],
  lines: [{ from: "A", to: "B", label: "5 cm" }, { from: "B", to: "C" }, { from: "A", to: "C" }],
  angles: [{ at: "B", from: "A", to: "C", label: "90°" }, { at: "A", from: "B", to: "C", label: "35°" }]
};

describe("figure descriptions", () => {
  it("accepts two- and three-set Venn diagrams and a geometry figure", () => {
    expect("figure" in parseFigure(venn2)).toBe(true);
    expect("figure" in parseFigure(venn3)).toBe(true);
    expect("figure" in parseFigure(triangle)).toBe(true);
  });

  it("rejects a Venn diagram with a missing or impossible region", () => {
    const missing = { ...venn2, counts: { "1": 12, "2": 8, none: 4 } };
    expect(parseFigure(missing)).toMatchObject({ error: expect.stringMatching(/count for region "12"/) });
    const wrong = { ...venn2, counts: { ...venn2.counts, "13": 2 } };
    expect(parseFigure(wrong)).toMatchObject({ error: expect.stringMatching(/not a region of a 2-set/) });
    const unknowns = { ...venn3, counts: { ...venn3.counts, "1": null, "2": null } };
    expect(parseFigure(unknowns)).toMatchObject({ error: expect.stringMatching(/At most two regions/) });
  });

  it("rejects geometry that points at a missing point, repeats a line, or stacks points", () => {
    expect(parseFigure({ ...triangle, lines: [{ from: "A", to: "Z" }] })).toMatchObject({ error: expect.stringMatching(/not listed/) });
    expect(parseFigure({ ...triangle, lines: [{ from: "A", to: "B" }, { from: "B", to: "A" }] })).toMatchObject({ error: expect.stringMatching(/twice/) });
    expect(parseFigure({ ...triangle, points: [{ name: "A", x: 10, y: 10 }, { name: "B", x: 11, y: 11 }, { name: "C", x: 45, y: 10 }] })).toMatchObject({ error: expect.stringMatching(/on top of each other/) });
    expect(parseFigure({ ...triangle, lines: [], angles: [] })).toMatchObject({ error: expect.stringMatching(/at least one line or circle/) });
    expect(parseFigure({ type: "radar" })).toHaveProperty("error");
    // A Venn diagram with one set (or four) is reported as an error, never a crash.
    expect(parseFigure({ type: "venn", sets: ["Only one"], counts: {} })).toHaveProperty("error");
    expect(parseFigure({ type: "venn", sets: ["A", "B", "C", "D"], counts: {} })).toHaveProperty("error");
    expect(toFigure({ type: "radar" })).toBeNull();
    expect(toFigure(null)).toBeNull();
  });

  it("describes a figure as text for the solver", () => {
    const venn = figureToText(fig(venn3));
    expect(venn).toContain("Only Tea: 10");
    expect(venn).toContain("Tea and Coffee only: 4");
    expect(venn).toContain("In all three (Tea, Coffee, Milk): 1");
    expect(venn).toContain("Outside all the sets: ? (unknown, to be found)");
    const geometry = figureToText(fig(triangle));
    expect(geometry).toContain("not drawn to scale");
    expect(geometry).toContain("AB = 5 cm");
    expect(geometry).toContain("∠ABC = 90°");
    expect(geometry).toContain("∠BAC = 35°");
    expect(figureToText(fig(venn2))).toContain("In both Cricket and Football: 5");
  });

  it("lists the numbers on the figure", () => {
    expect(figureNumbers(fig(venn3)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 6, 8, 10]);
    expect(figureNumbers(fig(triangle)).sort((a, b) => a - b)).toEqual([5, 35, 90]);
  });

  it("gives the same seed however the keys are ordered, and a different one for a different figure", () => {
    const a = fig(venn2);
    const reordered = { counts: { none: 4, "12": 5, "2": 8, "1": 12 }, sets: ["Cricket", "Football"], title: "Sports club", type: "venn" };
    expect(figureSeed(fig(reordered))).toBe(figureSeed(a));
    expect(figureSeed(fig({ ...venn2, counts: { ...venn2.counts, none: 5 } }))).not.toBe(figureSeed(a));
  });
});

describe("angles in the drawing", () => {
  it("measures the drawn angle and accepts a drawing close to its labels", () => {
    const figure = fig(triangle);
    expect(Math.round(drawnAngle(figure, figure.angles[0])!)).toBe(90);
    expect(Math.round(drawnAngle(figure, figure.angles[1])!)).toBe(35);
    expect(figureConsistencyProblem(figure)).toBeNull();
  });

  it("rejects a 90 degree label drawn as a wide angle, and ignores labels that are not numbers", () => {
    const wide = { ...triangle, points: [{ name: "A", x: 10, y: 60 }, { name: "B", x: 10, y: 10 }, { name: "C", x: 60, y: 55 }], angles: [{ at: "B", from: "A", to: "C", label: "90°" }] };
    expect(figureConsistencyProblem(fig(wide))).toMatch(/labelled 90° but drawn as about 4\d°/);
    const named = { ...wide, angles: [{ at: "B", from: "A", to: "C", label: "x" }] };
    expect(figureConsistencyProblem(fig(named))).toBeNull();
    expect(figureConsistencyProblem(fig(venn2))).toBeNull();
  });
});

describe("references to a figure", () => {
  const options = { A: "1", B: "2", C: "3", D: "4" };

  it("lets a question refer to its own figure, and still blocks pictures that cannot be drawn", () => {
    expect(figureProblem("In the figure, find angle x.", options)).toMatch(/figure, diagram or picture/);
    expect(figureProblem("In the figure, find angle x.", options, { hasFigure: true })).toBeNull();
    expect(figureProblem("In the Venn diagram, how many play only cricket?", options, { hasFigure: true })).toBeNull();
    expect(figureProblem("Find the mirror image of the word.", options, { hasFigure: true })).toMatch(/mirror image/);
    expect(figureProblem("Which figure completes the series?", options, { hasFigure: true })).toMatch(/cannot be drawn/);
  });

  it("still blocks a chart reference when only a figure is present", () => {
    expect(figureProblem("According to the bar chart, what was the rise?", options, { hasFigure: true })).toMatch(/graph or chart/);
  });
});

describe("checks on a question with a figure", () => {
  const draft = questionDraftSchema.parse({
    exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Triangles", difficulty: "moderate",
    question: "In the figure, angle ABC is 90 degrees and angle BAC is 35 degrees. Find angle ACB.",
    options: { A: "45°", B: "55°", C: "65°", D: "35°" }, correct_answer: "B",
    explanation: "Key idea: the angles of a triangle add up to 180°.\nStep 1: ∠B = 90° and ∠A = 35°.\nStep 2: ∠C = 180° - 90° - 35° = 55°.\nAnswer: (B) 55°\nWhy not the others: they come from slips in the subtraction.",
    estimated_time_seconds: 60
  });
  const figure = fig(triangle);

  it("passes when the question has the figure it points at and uses its numbers", () => {
    const { checks } = runCodeValidation(draft, "180 - 90 - 35", { figure });
    const failed = checks.filter((check) => !check.passed);
    expect(failed).toEqual([]);
    expect(checks.map((check) => check.name)).toEqual(expect.arrayContaining(["no_missing_figure", "figure_matches_labels", "uses_the_data"]));
  });

  it("fails when the figure is missing, mislabelled, or ignored", () => {
    expect(runCodeValidation(draft, "180 - 90 - 35").checks.find((check) => check.name === "no_missing_figure")?.passed).toBe(false);
    const wide = fig({ ...triangle, points: [{ name: "A", x: 10, y: 60 }, { name: "B", x: 10, y: 10 }, { name: "C", x: 90, y: 40 }] });
    expect(runCodeValidation(draft, "180 - 90 - 35", { figure: wide }).checks.find((check) => check.name === "figure_matches_labels")?.passed).toBe(false);
    expect(runCodeValidation(draft, "180 - 70 - 45", { figure }).checks.find((check) => check.name === "uses_the_data")?.passed).toBe(false);
  });

  it("shows the figure checks in plain words", () => {
    const { checks } = runCodeValidation(draft, "180 - 70 - 45", { figure });
    const labels = summariseChecks({ checks }).map((line) => line.label);
    expect(labels).toEqual(expect.arrayContaining(["Figure matches its labels", "Working uses the data or figure"]));
  });
});

describe("drawing a figure", () => {
  const render = (input: unknown) => renderToStaticMarkup(createElement(Figure, { figure: fig(input) }));

  it("draws a Venn diagram with every count, set name and the unknown as a question mark", () => {
    const html = render(venn3);
    for (const text of ["Tea", "Coffee", "Milk", ">10<", ">8<", ">6<", ">4<", ">3<", ">2<", ">1<", ">?<"]) expect(html).toContain(text);
    expect(html).toContain('role="img"');
    expect(render(venn2)).toContain("Sports club");
  });

  it("draws geometry with point names, lengths, a right-angle mark and a not-to-scale note", () => {
    const html = render(triangle);
    for (const text of [">A<", ">B<", ">C<", "5 cm", "35°", "Not drawn to scale"]) expect(html).toContain(text);
    expect(html).toContain("<polyline");
  });

  it("draws a circle with its label", () => {
    const html = render({ type: "geometry", points: [{ name: "O", x: 50, y: 50 }, { name: "P", x: 80, y: 50 }], lines: [{ from: "O", to: "P", label: "7 cm" }], circles: [{ center: "O", radius: 30, label: "r = 7 cm" }], angles: [] });
    expect(html).toContain("<circle");
    expect(html).toContain("r = 7 cm");
  });
});

describe("uploaded pictures", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0]);

  it("accepts a real picture with a description", () => {
    expect(checkQuestionImage(png, "A triangle ABC with a line DE parallel to BC")).toEqual({ type: "image/png", alt: "A triangle ABC with a line DE parallel to BC" });
  });

  it("rejects the wrong file type, a huge file, and a missing description", () => {
    expect(checkQuestionImage(new Uint8Array([60, 115, 118, 103, 62, 0, 0, 0, 0, 0, 0, 0, 0]), "A triangle with a line parallel to the base")).toMatchObject({ error: expect.stringMatching(/PNG, JPG or WebP/) });
    expect(checkQuestionImage(new Uint8Array(800 * 1024).fill(1), "A triangle with a line parallel to the base")).toMatchObject({ error: expect.stringMatching(/over 700 KB/) });
    expect(checkQuestionImage(png, "triangle")).toMatchObject({ error: expect.stringMatching(/at least 10 characters/) });
  });
});
