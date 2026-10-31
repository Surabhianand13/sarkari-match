import { z } from "zod";

// A chart is stored as numbers, never as a picture. The site draws it, the factory recomputes answers from it, and the
// independent solver is given the same numbers as a table.

export const chartTypes = ["bar", "line", "pie"] as const;

export const chartSpecSchema = z
  .object({
    type: z.enum(chartTypes),
    title: z.string().trim().min(3).max(120),
    unit: z.string().trim().max(24).optional(),
    categories: z.array(z.string().trim().min(1).max(24)).min(2).max(8),
    series: z
      .array(z.object({ name: z.string().trim().min(1).max(30), values: z.array(z.number().finite().min(0).max(1_000_000_000)).min(2).max(8) }))
      .min(1)
      .max(4)
  })
  .superRefine((chart, ctx) => {
    if (chart.series.some((series) => series.values.length !== chart.categories.length)) ctx.addIssue({ code: "custom", message: "Every series needs one value per category.", path: ["series"] });
    if (chart.type === "pie") {
      if (chart.series.length !== 1) ctx.addIssue({ code: "custom", message: "A pie chart has exactly one series.", path: ["series"] });
      else if (chart.series[0].values.reduce((sum, value) => sum + value, 0) <= 0) ctx.addIssue({ code: "custom", message: "A pie chart needs a positive total.", path: ["series"] });
    }
    if (new Set(chart.categories.map((category) => category.toLowerCase())).size !== chart.categories.length) ctx.addIssue({ code: "custom", message: "Category names must all be different.", path: ["categories"] });
  });

export type ChartSpec = z.infer<typeof chartSpecSchema>;

export function parseChart(input: unknown): { chart: ChartSpec } | { error: string } {
  const result = chartSpecSchema.safeParse(input);
  return result.success ? { chart: result.data } : { error: result.error.issues.map((issue) => issue.message).join(" ") };
}

const trimNumber = (value: number) => String(Math.round(value * 100) / 100);

// The chart's data as a text table: what the solver and reviewer read, and what a screen reader gets.
export function chartToText(chart: ChartSpec): string {
  const kind = chart.type === "pie" ? "Pie chart" : chart.type === "line" ? "Line graph" : "Bar chart";
  const unit = chart.unit ? ` (${chart.unit})` : "";
  if (chart.type === "pie") {
    const total = chart.series[0].values.reduce((sum, value) => sum + value, 0);
    return [`${kind}: ${chart.title}${unit}`, "| Category | Value | Share |", "|---|---|---|", ...chart.categories.map((category, index) => `| ${category} | ${trimNumber(chart.series[0].values[index])} | ${trimNumber((chart.series[0].values[index] / total) * 100)}% |`)].join("\n");
  }
  return [
    `${kind}: ${chart.title}${unit}`,
    `| Category | ${chart.series.map((series) => series.name).join(" | ")} |`,
    `|---|${chart.series.map(() => "---").join("|")}|`,
    ...chart.categories.map((category, index) => `| ${category} | ${chart.series.map((series) => trimNumber(series.values[index])).join(" | ")} |`)
  ].join("\n");
}

// Every number a learner can read off the chart, used to check that a question's working really uses the data.
export function chartNumbers(chart: ChartSpec): number[] {
  const numbers = chart.series.flatMap((series) => series.values);
  if (chart.type === "pie") {
    const total = numbers.reduce((sum, value) => sum + value, 0);
    numbers.push(total, ...numbers.map((value) => Math.round((value / total) * 10000) / 100));
  }
  return numbers;
}
