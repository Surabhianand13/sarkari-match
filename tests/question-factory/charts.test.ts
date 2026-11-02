import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Chart, niceScale } from "@/components/chart";
import { SetStimulus } from "@/components/set-stimulus";
import { chartNumbers, chartToText, parseChart } from "@/lib/chart";
import { groundingProblem, setContextText, setNumbers, setProblem, toQuestionSet } from "@/lib/question-sets";
import { figureProblem } from "@/lib/rich-text";
import { runCodeValidation } from "@/lib/question-factory/validator";

const bar = { type: "bar", title: "Sales by year", unit: "₹ lakh", categories: ["2019", "2020", "2021"], series: [{ name: "Sales", values: [120, 150, 180] }, { name: "Cost", values: [100, 120, 130] }] };
const pie = { type: "pie", title: "Share of sales", categories: ["North", "South", "East"], series: [{ name: "Sales", values: [50, 30, 20] }] };
const table = "| Year | Sales |\n|---|---|\n| 2019 | 120 |\n| 2020 | 150 |";

describe("chart data", () => {
  it("accepts bar, line and pie data", () => {
    expect("chart" in parseChart(bar)).toBe(true);
    expect("chart" in parseChart({ ...bar, type: "line" })).toBe(true);
    expect("chart" in parseChart(pie)).toBe(true);
  });

  it("rejects broken data", () => {
    expect(parseChart({ ...bar, series: [{ name: "Sales", values: [1, 2] }] })).toMatchObject({ error: expect.stringMatching(/one value per category/) });
    expect(parseChart({ ...pie, series: [pie.series[0], pie.series[0]] })).toMatchObject({ error: expect.stringMatching(/exactly one series/) });
    expect(parseChart({ ...bar, categories: ["2019", "2019", "2021"] })).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(parseChart({ ...bar, series: [{ name: "Sales", values: [-5, 2, 3] }, bar.series[1]] })).toHaveProperty("error");
    expect(parseChart({ type: "donut" })).toHaveProperty("error");
  });

  it("describes a chart as a text table for the solver, with shares for a pie", () => {
    const text = chartToText(parseChart(bar) && (parseChart(bar) as { chart: never }).chart);
    expect(text).toContain("| Category | Sales | Cost |");
    expect(text).toContain("| 2020 | 150 | 120 |");
    const pieText = chartToText((parseChart(pie) as { chart: never }).chart);
    expect(pieText).toContain("| North | 50 | 50% |");
  });

  it("lists every number a learner can read, including pie shares and the total", () => {
    const numbers = chartNumbers((parseChart(pie) as { chart: never }).chart);
    expect(numbers).toEqual(expect.arrayContaining([50, 30, 20, 100]));
  });

  it("gives clean axis ticks", () => {
    expect(niceScale(180)).toEqual({ top: 200, step: 50 });
    expect(niceScale(7)).toEqual({ top: 8, step: 2 });
    expect(niceScale(0).top).toBe(1);
  });
});

describe("drawing a chart", () => {
  it("draws bars with values, axis, legend and an accessible description", () => {
    const html = renderToStaticMarkup(createElement(Chart, { chart: (parseChart(bar) as { chart: never }).chart }));
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html).toContain("Sales by year");
    expect(html).toContain(">180<");
    expect(html).toContain("Cost");
    expect((html.match(/<rect/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it("draws a line graph and a pie with percentages", () => {
    const line = renderToStaticMarkup(createElement(Chart, { chart: (parseChart({ ...bar, type: "line" }) as { chart: never }).chart }));
    expect(line).toContain("<polyline");
    const pieHtml = renderToStaticMarkup(createElement(Chart, { chart: (parseChart(pie) as { chart: never }).chart }));
    expect(pieHtml).toContain("50%");
    expect(pieHtml).toContain("<path");
  });

  it("falls back to a data table when there are too many bars to label", () => {
    const crowded = { type: "bar", title: "Many bars here", categories: ["A", "B", "C", "D", "E", "F"], series: [1, 2, 3].map((n) => ({ name: `S${n}`, values: [1, 2, 3, 4, 5, 6].map((v) => v * n) })) };
    expect(renderToStaticMarkup(createElement(Chart, { chart: (parseChart(crowded) as { chart: never }).chart }))).toContain("<table");
  });

  it("shows a set's table and chart together", () => {
    const set = toQuestionSet({ id: "s1", title: "Shop data", stimulus: `The shop's figures.\n${table}`, chart: bar });
    const html = renderToStaticMarkup(createElement(SetStimulus, { set }));
    expect(html).toContain("Shop data");
    expect(html).toContain("<table");
    expect(html).toContain("<svg");
  });
});

describe("data sets", () => {
  it("needs a chart or a table", () => {
    expect(setProblem({ stimulus: "Just words.", chart: null })).toMatch(/chart or a table/);
    expect(setProblem({ stimulus: "", chart: bar })).toBeNull();
    expect(setProblem({ stimulus: table, chart: null })).toBeNull();
    expect(setProblem({ stimulus: "", chart: { ...bar, type: "donut" } })).toMatch(/not valid/);
  });

  it("gives the solver the data as text", () => {
    const set = toQuestionSet({ id: "s1", title: "Shop data", stimulus: table, chart: null });
    expect(setContextText(set)).toContain("Data set: Shop data");
    expect(setContextText(set)).toContain("| 2020 | 150 |");
  });

  it("checks the working really uses the data", () => {
    const data = setNumbers({ stimulus: table, chart: null });
    expect(groundingProblem("(150 - 120) / 120 * 100", data)).toBeNull();
    expect(groundingProblem("(260 - 190) / 190 * 100", data)).toMatch(/does not use any number from the data/);
    expect(groundingProblem("100 * 2 + 5", data)).toBeNull();
    expect(groundingProblem(null, data)).toBeNull();
  });

  it("lets a question refer to its own chart or table, but never to a picture", () => {
    const options = { A: "1", B: "2", C: "3", D: "4" };
    expect(figureProblem("According to the bar chart, what was the rise?", options)).toMatch(/graph or chart/);
    expect(figureProblem("According to the bar chart, what was the rise?", options, { hasChart: true })).toBeNull();
    expect(figureProblem("Using the table below, find the total.", options, { hasTable: true })).toBeNull();
    expect(figureProblem("In the figure, find angle x.", options, { hasChart: true, hasTable: true })).toMatch(/figure, diagram or picture/);
  });

  it("is checked when validating a set question", () => {
    const set = toQuestionSet({ id: "s1", title: "Shop data", stimulus: "", chart: bar });
    const draft = { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Data Interpretation", difficulty: "moderate" as const, question: "According to the bar chart, by how much did sales rise from 2019 to 2020?", options: { A: "20", B: "30", C: "40", D: "50" }, correct_answer: "B" as const, explanation: "Key idea: difference.\nStep 1: From the data, 2019 = 120 and 2020 = 150.\nAnswer: (B) 30\nWhy not the others: they come from misreading the bars.", estimated_time_seconds: 60, source_type: "original_ai_generated" as const };
    const good = runCodeValidation(draft, "150 - 120", { set });
    expect(good.checks.filter((c) => !c.passed)).toEqual([]);
    expect(good.checks.find((c) => c.name === "uses_the_data")?.passed).toBe(true);
    expect(runCodeValidation(draft, "150 - 120").checks.find((c) => c.name === "no_missing_figure")?.passed).toBe(false);
    expect(runCodeValidation(draft, "777 - 555", { set }).checks.find((c) => c.name === "uses_the_data")?.passed).toBe(false);
  });
});

describe("stacked, histogram and combined charts", () => {
  const stacked = { type: "stacked", title: "Students by stream", unit: "students", categories: ["2019", "2020", "2021"], series: [{ name: "Arts", values: [40, 50, 60] }, { name: "Science", values: [60, 70, 80] }] };
  const histogram = { type: "histogram", title: "Marks of 60 students", categories: ["0-10", "10-20", "20-30", "30-40"], series: [{ name: "Students", values: [5, 15, 25, 15] }] };
  const combo = { type: "combo", title: "Sales and profit", categories: ["2019", "2020", "2021"], series: [{ name: "Sales", as: "bar", values: [120, 150, 180] }, { name: "Profit %", as: "line", values: [10, 15, 20] }] };

  const chartOf = (input: unknown) => {
    const parsed = parseChart(input);
    if (!("chart" in parsed)) throw new Error(parsed.error);
    return parsed.chart;
  };

  it("accepts each of them and rejects the wrong number or kind of series", () => {
    for (const chart of [stacked, histogram, combo]) expect("chart" in parseChart(chart)).toBe(true);
    expect(parseChart({ ...stacked, series: [stacked.series[0]] })).toMatchObject({ error: expect.stringMatching(/at least two series/) });
    expect(parseChart({ ...histogram, series: [histogram.series[0], histogram.series[0]] })).toMatchObject({ error: expect.stringMatching(/exactly one series/) });
    expect(parseChart({ ...combo, series: [{ ...combo.series[0], as: undefined }, combo.series[1]] })).toMatchObject({ error: expect.stringMatching(/"bar" or a "line"/) });
    expect(parseChart({ ...combo, series: [combo.series[0], { ...combo.series[1], as: "bar" }] })).toMatchObject({ error: expect.stringMatching(/one bar series and one line series/) });
  });

  it("describes them as text, with totals for a stack and the line marked in a combination", () => {
    const stackText = chartToText(chartOf(stacked));
    expect(stackText).toContain("Stacked bar chart: Students by stream (students)");
    expect(stackText).toContain("| Category | Arts | Science | Total |");
    expect(stackText).toContain("| 2020 | 50 | 70 | 120 |");
    expect(chartToText(chartOf(histogram))).toContain("| Class interval | Students |");
    const comboText = chartToText(chartOf(combo));
    expect(comboText).toContain("| Category | Sales (bar) | Profit % (line) |");
  });

  it("lists the totals of a stack among the numbers a learner can read", () => {
    expect(chartNumbers(chartOf(stacked))).toEqual(expect.arrayContaining([100, 120, 140]));
  });

  it("draws a stacked bar with part values, totals and a legend", () => {
    const html = renderToStaticMarkup(createElement(Chart, { chart: chartOf(stacked) }));
    for (const text of [">40<", ">60<", ">100<", ">120<", ">140<", "Arts", "Science"]) expect(html).toContain(text);
  });

  it("draws a histogram with touching bars and no legend", () => {
    const html = renderToStaticMarkup(createElement(Chart, { chart: chartOf(histogram) }));
    for (const text of [">25<", ">0-10<", ">30-40<"]) expect(html).toContain(text);
    expect(html).not.toContain("<ul");
  });

  it("draws a combination with bars, a line and a legend that says which is which", () => {
    const html = renderToStaticMarkup(createElement(Chart, { chart: chartOf(combo) }));
    expect(html).toContain("<polyline");
    expect(html).toContain("<rect");
    expect(html).toContain("Sales (bars)");
    expect(html).toContain("Profit % (line, right axis)");
  });

  it("lets a question refer to a histogram only when the set has a chart", () => {
    const options = { A: "1", B: "2", C: "3", D: "4" };
    expect(figureProblem("In the histogram, how many scored above 20?", options)).toMatch(/graph or chart/);
    expect(figureProblem("In the histogram, how many scored above 20?", options, { hasChart: true })).toBeNull();
  });
});
