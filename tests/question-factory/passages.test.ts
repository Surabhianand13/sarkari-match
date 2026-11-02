import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SetStimulus } from "@/components/set-stimulus";
import { passageProblem, setContextText, setProblem, toQuestionSet } from "@/lib/question-sets";

const prose = "The river had flooded the lower fields by morning, and the villagers gathered on the bridge to watch the water rise. ".repeat(6);
const cloze = "Last summer our school (1) ______ a trip to the hills. We (2) ______ early in the morning and reached the base by noon. The guide (3) ______ us about the plants along the path, and everyone (4) ______ carefully so that nobody fell behind. By evening we were tired but (5) ______ with what we had seen. It was a day that none of us will forget soon, and we have already asked our teacher to plan another one for the winter holidays, if the weather allows it. Our parents, too, were pleased to hear how well the whole group had behaved during the long walk back down the hill.";

describe("passage sets", () => {
  it("accepts a passage of the right length", () => {
    expect(passageProblem("passage", prose)).toBeNull();
    expect(setProblem({ kind: "passage", stimulus: prose, chart: null })).toBeNull();
  });

  it("rejects a passage that is too short, too long, or carries a chart", () => {
    expect(passageProblem("passage", "Too short.")).toMatch(/too short/);
    expect(passageProblem("passage", "word ".repeat(1000))).toMatch(/too long/);
    expect(setProblem({ kind: "passage", stimulus: prose, chart: { type: "bar" } })).toMatch(/cannot also carry a chart/);
  });

  it("needs numbered blanks in a cloze passage", () => {
    expect(passageProblem("cloze", cloze)).toBeNull();
    expect(passageProblem("cloze", prose)).toMatch(/numbered blanks/);
    expect(passageProblem("cloze", cloze.replace(/\(\d\) ______/g, "..."))).toMatch(/numbered blanks/);
  });

  it("still insists that a data set has a table or chart", () => {
    expect(setProblem({ stimulus: prose, chart: null })).toMatch(/needs a chart or a table/);
  });

  it("labels the passage for the solver and reviewer", () => {
    const set = toQuestionSet({ id: "s1", kind: "passage", title: "Floods", stimulus: prose, chart: null });
    expect(setContextText(set)).toMatch(/^Passage: Floods/);
    expect(setContextText(toQuestionSet({ id: "s2", kind: "cloze", title: "Trip", stimulus: cloze, chart: null }))).toMatch(/^Cloze passage: Trip/);
    expect(setContextText(toQuestionSet({ id: "s3", title: "Sales", stimulus: "x", chart: null }))).toMatch(/^Data set: Sales/);
  });

  it("shows a passage in a scrollable box with the right heading, and data without one", () => {
    const passageHtml = renderToStaticMarkup(createElement(SetStimulus, { set: toQuestionSet({ id: "s1", kind: "passage", title: "Floods", stimulus: `${prose}\n\nSecond paragraph.`, chart: null }) }));
    expect(passageHtml).toContain("Read the passage");
    expect(passageHtml).toContain("overflow-y-auto");
    expect(passageHtml).toContain("Second paragraph.");
    expect(renderToStaticMarkup(createElement(SetStimulus, { set: toQuestionSet({ id: "s2", kind: "cloze", title: "Trip", stimulus: cloze, chart: null }) }))).toContain("fill in the blanks");
    const dataHtml = renderToStaticMarkup(createElement(SetStimulus, { set: toQuestionSet({ id: "s3", title: "Sales", stimulus: "Sales of a shop.", chart: null }) }));
    expect(dataHtml).toContain("Data for this question");
    expect(dataHtml).not.toContain("overflow-y-auto");
  });
});
