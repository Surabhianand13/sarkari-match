import type { ChartSpec } from "@/lib/chart";

// The part of chart handling the browser needs to draw a chart. Kept apart from lib/chart.ts, which carries the validation
// library, so learners' pages do not download it.

const trimNumber = (value: number) => String(Math.round(value * 100) / 100);

// For a stacked bar chart: the height of each whole bar.
export function stackTotals(chart: ChartSpec): number[] {
  return chart.categories.map((_, index) => chart.series.reduce((sum, series) => sum + series.values[index], 0));
}

const kindNames: Record<ChartSpec["type"], string> = { bar: "Bar chart", line: "Line graph", pie: "Pie chart", stacked: "Stacked bar chart", histogram: "Histogram", combo: "Combined bar and line chart" };

// The chart's data as a text table: what the solver and reviewer read, and what a screen reader gets.
export function chartToText(chart: ChartSpec): string {
  const kind = kindNames[chart.type];
  const unit = chart.unit ? ` (${chart.unit})` : "";
  if (chart.type === "pie") {
    const total = chart.series[0].values.reduce((sum, value) => sum + value, 0);
    return [`${kind}: ${chart.title}${unit}`, "| Category | Value | Share |", "|---|---|---|", ...chart.categories.map((category, index) => `| ${category} | ${trimNumber(chart.series[0].values[index])} | ${trimNumber((chart.series[0].values[index] / total) * 100)}% |`)].join("\n");
  }
  if (chart.type === "histogram") {
    return [`${kind}: ${chart.title}${unit}`, `| Class interval | ${chart.series[0].name} |`, "|---|---|", ...chart.categories.map((category, index) => `| ${category} | ${trimNumber(chart.series[0].values[index])} |`)].join("\n");
  }
  const heading = (series: ChartSpec["series"][number]) => (chart.type === "combo" ? `${series.name} (${series.as})` : series.name);
  const totals = chart.type === "stacked" ? stackTotals(chart) : null;
  return [
    `${kind}: ${chart.title}${unit}`,
    `| Category | ${chart.series.map(heading).join(" | ")}${totals ? " | Total" : ""} |`,
    `|---|${chart.series.map(() => "---").join("|")}${totals ? "|---" : ""}|`,
    ...chart.categories.map((category, index) => `| ${category} | ${chart.series.map((series) => trimNumber(series.values[index])).join(" | ")}${totals ? ` | ${trimNumber(totals[index])}` : ""} |`)
  ].join("\n");
}
