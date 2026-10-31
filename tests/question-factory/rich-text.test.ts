import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Inline, Rich } from "@/components/rich-text";
import { SolutionText } from "@/components/solution-text";
import { figureProblem, parseInline, parseRichBlocks, richTextProblem } from "@/lib/rich-text";
import { runCodeValidation } from "@/lib/question-factory/validator";
import { generateTemplateQuestion, templatesForTopic } from "@/lib/question-factory/templates";

const table = "| Year | Sales | Profit |\n|---|---|---|\n| 2019 | 120 | 20 |\n| 2020 | 150 | 30 |";

describe("tables", () => {
  it("splits a question into text and a table", () => {
    const blocks = parseRichBlocks(`The table shows sales.\n${table}\nWhat was the rise in profit?`);
    expect(blocks.map((b) => b.type)).toEqual(["text", "table", "text"]);
    const t = blocks[1];
    expect(t.type === "table" && t.header).toEqual(["Year", "Sales", "Profit"]);
    expect(t.type === "table" && t.rows).toEqual([["2019", "120", "20"], ["2020", "150", "30"]]);
  });

  it("leaves plain text and absolute values alone", () => {
    expect(parseRichBlocks("Solve |x - 3| = 5 for x.")).toEqual([{ type: "text", text: "Solve |x - 3| = 5 for x." }]);
    expect(richTextProblem("|x| + |y|\n|x| - |y|")).toMatch(/header row/);
    expect(richTextProblem("Solve |x| + |y| = 5.")).toBeNull();
  });

  it("accepts a good table and rejects broken ones", () => {
    expect(richTextProblem(table)).toBeNull();
    expect(richTextProblem("| A | B |\n| 1 | 2 |")).toMatch(/separator row/);
    expect(richTextProblem("| A | B |\n|---|---|")).toMatch(/data row/);
    expect(richTextProblem("| A | B |\n|---|---|\n| 1 | 2 | 3 |")).toMatch(/same number of cells/);
  });

  it("does not allow a table inside an option", () => {
    expect(richTextProblem("A\nB", { singleLine: true })).toMatch(/single line/);
    expect(richTextProblem("25%", { singleLine: true })).toBeNull();
  });
});

describe("maths notation", () => {
  it("draws powers and subscripts", () => {
    expect(parseInline("x^2 + y^{n+1} = a_1")).toEqual([
      { kind: "text", text: "x" }, { kind: "sup", text: "2" }, { kind: "text", text: " + y" }, { kind: "sup", text: "n+1" }, { kind: "text", text: " = a" }, { kind: "sub", text: "1" }
    ]);
    expect(parseInline("plain text, no maths")).toEqual([{ kind: "text", text: "plain text, no maths" }]);
  });

  it("rejects LaTeX, HTML, images and stray control characters", () => {
    expect(richTextProblem("Find \\frac{3}{4} of 20")).toMatch(/plain Unicode/);
    expect(richTextProblem("Use $$x^2$$")).toMatch(/plain Unicode/);
    expect(richTextProblem("See ![chart](http://x/y.png)")).toMatch(/Images/);
    expect(richTextProblem("<img src=x>")).toMatch(/Images/);
    expect(richTextProblem("Find \u000crac{3}{4}")).toMatch(/control character/);
    expect(richTextProblem("2^{n+1")).toMatch(/closing brace/);
    expect(richTextProblem("√(x² + 9) = 5 and 2^{n+1}")).toBeNull();
    expect(richTextProblem("Price is $500 and ₹4,200")).toBeNull();
  });
});

describe("figure guard", () => {
  it.each([
    "In the figure below, AB is parallel to CD. Find angle x.",
    "Study the pie chart and answer the question.",
    "The bar graph shows sales. What is the rise?",
    "Which Venn diagram best represents doctors, men and teachers?",
    "Find the mirror image of the given figure.",
    "According to the given diagram, what is the area?"
  ])("blocks: %s", (stem) => {
    expect(figureProblem(stem, { A: "1", B: "2", C: "3", D: "4" })).toMatch(/figure|diagram|graph|chart/i);
  });

  it.each([
    "What is the largest five-figure number divisible by 12?",
    "Round 3.14159 to three significant figures.",
    "Find the slope of the graph of y = 2x + 3.",
    "Solve |x - 3| = 5.",
    "A can complete a piece of work in 12 days. In how many days will A and B together complete it?"
  ])("allows: %s", (stem) => {
    expect(figureProblem(stem, { A: "1", B: "2", C: "3", D: "4" })).toBeNull();
  });

  it("needs the table to be present when the question points at one", () => {
    expect(figureProblem("Using the table below, find the total profit.", { A: "1", B: "2", C: "3", D: "4" })).toMatch(/table that is not included/);
    expect(figureProblem(`Using the table below, find the total profit.\n${table}`, { A: "1", B: "2", C: "3", D: "4" })).toBeNull();
  });

  it("is part of the code validation, and arithmetic templates still pass it", () => {
    const draft = { exam: "SSC CGL", tier: "Tier I", subject: "Reasoning", topic: "t", difficulty: "moderate" as const, question: "In the figure below find x.", options: { A: "1", B: "2", C: "3", D: "4" }, correct_answer: "A" as const, explanation: "Key idea: x.\nStep 1: a.\nAnswer: (A) 1\nWhy not the others: slips happen here and there.", estimated_time_seconds: 60, source_type: "original_ai_generated" as const };
    expect(runCodeValidation(draft).checks.find((c) => c.name === "no_missing_figure")?.passed).toBe(false);
    for (const [name] of templatesForTopic()) {
      for (let seed = 1; seed <= 25; seed++) {
        const q = generateTemplateQuestion(name, "moderate", seed);
        if (!q) continue;
        const failed = runCodeValidation(q.draft, q.verificationExpression).checks.filter((c) => !c.passed);
        expect(failed, `${name} seed ${seed}`).toEqual([]);
      }
    }
  });
});

describe("drawing", () => {
  it("renders a table, powers and subscripts", () => {
    const html = renderToStaticMarkup(createElement(Rich, { text: `Sales are shown.\n${table}\nFind x^2.` }));
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<sup>2</sup>");
    expect(html).toContain("Sales are shown.");
  });

  it("renders option text with a power", () => {
    expect(renderToStaticMarkup(createElement(Inline, { text: "2^{n+1}" }))).toContain("<sup>n+1</sup>");
  });

  it("renders a solution with a table and bold labels", () => {
    const html = renderToStaticMarkup(createElement(SolutionText, { text: `Key idea: compare the years.\nStep 1: Read the table.\n${table}\nAnswer: (B) 30` }));
    expect(html).toContain("<table");
    expect(html).toContain("Key idea: ");
    expect(html).toContain("Answer: ");
  });
});
