import type { ChartSpec } from "@/lib/chart";

// The part of chart handling the browser needs to draw a chart. Kept apart from lib/chart.ts, which carries the validation
// library, so learners' pages do not download it.

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
