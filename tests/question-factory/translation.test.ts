import { describe, expect, it } from "vitest";
import { figureTranslationProblem, translationProblem } from "@/lib/translation";
import { parseFigure } from "@/lib/figure";

const english = {
  stem: "| Year | Sales |\n|---|---|\n| 2019 | 1,200 |\n| 2020 | 1,500 |\nWhat is the rise in sales from 2019 to 2020?",
  options: { A: "200", B: "300", C: "400", D: "500" },
  explanation: "Key idea: difference.\nStep 1: 1,500 - 1,200 = 300.\nAnswer: (B) 300\nWhy not the others: slips.",
  correct: "B"
};
const hindi = {
  stem: "| वर्ष | बिक्री |\n|---|---|\n| 2019 | 1200 |\n| 2020 | 1500 |\n2019 से 2020 तक बिक्री में कितनी वृद्धि हुई?",
  options: { A: "200", B: "300", C: "400", D: "500" },
  explanation: "मुख्य विचार: अंतर।\nचरण 1: 1500 - 1200 = 300।\nउत्तर: (B) 300\nअन्य विकल्प क्यों नहीं: गलतियाँ।"
};

describe("checking a Hindi translation", () => {
  it("accepts a faithful translation, whether or not thousands commas are kept", () => {
    expect(translationProblem(english, hindi)).toBeNull();
    expect(translationProblem(english, { ...hindi, stem: hindi.stem.replace("1200", "1,200") })).toBeNull();
  });

  it("rejects Devanagari digits, English text and a changed number", () => {
    expect(translationProblem(english, { ...hindi, stem: hindi.stem.replace("2019 से", "२०१९ से") })).toMatch(/digits 0-9/);
    expect(translationProblem(english, { ...hindi, stem: english.stem })).toMatch(/not written in Hindi/);
    expect(translationProblem(english, { ...hindi, stem: hindi.stem.replace("1500", "1600") })).toMatch(/numbers in the Hindi question differ/);
    expect(translationProblem(english, { ...hindi, options: { ...hindi.options, B: "350" } })).toMatch(/option B differ/);
  });

  it("rejects a table that lost a row, and a missing option", () => {
    expect(translationProblem(english, { ...hindi, stem: hindi.stem.replace("| 2020 | 1500 |\n", "") })).toMatch(/numbers|table/);
    expect(translationProblem(english, { ...hindi, options: { ...hindi.options, D: "" } })).toMatch(/Option D is empty/);
  });

  it("insists the solution keeps one line per line and ends at the same option", () => {
    expect(translationProblem(english, { ...hindi, explanation: hindi.explanation.replace("\nअन्य विकल्प क्यों नहीं: गलतियाँ।", "") })).toMatch(/3 lines but the English one has 4/);
    expect(translationProblem(english, { ...hindi, explanation: hindi.explanation.replace("उत्तर: (B) 300", "उत्तर: (C) 300") })).toMatch(/must name option \(B\)/);
    expect(translationProblem(english, { ...hindi, explanation: hindi.explanation.replace("उत्तर: (B) 300", "उत्तर: 300") })).toMatch(/must name option \(B\)/);
  });

  it("lets a unit be translated but keeps a bare number as it is", () => {
    const speed = { stem: "A train covers 120 km in 2 hours. Find its speed.", options: { A: "40 km/h", B: "50 km/h", C: "60 km/h", D: "70 km/h" }, explanation: english.explanation.replace("(B) 300", "(C) 60km/h").replace("300", "60"), correct: "C" };
    const hi = { stem: "एक रेलगाड़ी 2 घंटे में 120 किमी चलती है। उसकी चाल ज्ञात कीजिए।", options: { A: "40 किमी/घंटा", B: "50 किमी/घंटा", C: "60 किमी/घंटा", D: "70 किमी/घंटा" }, explanation: "मुख्य विचार: चाल।\nचरण 1: 60 = 60।\nउत्तर: (C) 60 किमी/घंटा\nअन्य विकल्प क्यों नहीं: गलतियाँ।" };
    const bare = { ...speed, options: { A: "40", B: "50", C: "60", D: "70" }, explanation: speed.explanation };
    expect(translationProblem({ ...speed, explanation: "Key idea: speed.\nStep 1: 60 = 60.\nAnswer: (C) 60 km/h\nWhy not the others: slips." }, hi)).toBeNull();
    expect(translationProblem({ ...bare, explanation: "Key idea: speed.\nStep 1: 60 = 60.\nAnswer: (C) 60\nWhy not the others: slips." }, { ...hi, options: { A: "40", B: "50", C: "sixty 60", D: "70" } })).toMatch(/Option C should stay as it is/);
  });
});

describe("checking a translated figure", () => {
  const venn = parseFigure({ type: "venn", title: "Sports club", sets: ["Cricket", "Football"], counts: { "1": 12, "2": null, "12": 5, none: 4 } });
  const triangle = parseFigure({
    type: "geometry", title: "Right triangle",
    points: [{ name: "A", x: 10, y: 60 }, { name: "B", x: 10, y: 10 }, { name: "C", x: 45, y: 10 }],
    lines: [{ from: "A", to: "B", label: "5 cm" }, { from: "B", to: "C" }], angles: [{ at: "B", from: "A", to: "C", label: "90°" }]
  });
  if (!("figure" in venn) || !("figure" in triangle)) throw new Error("fixtures are invalid");

  it("accepts translated names and labels", () => {
    expect(figureTranslationProblem(venn.figure, { type: "venn", title: "खेल क्लब", sets: ["क्रिकेट", "फुटबॉल"], counts: { "1": 12, "2": null, "12": 5, none: 4 } })).toHaveProperty("figure");
    expect(figureTranslationProblem(triangle.figure, { type: "geometry", title: "समकोण त्रिभुज", points: triangle.figure.type === "geometry" ? triangle.figure.points : [], lines: [{ from: "A", to: "B", label: "5 सेमी" }, { from: "B", to: "C" }], angles: [{ at: "B", from: "A", to: "C", label: "90°" }] })).toHaveProperty("figure");
  });

  it("rejects a changed count, a moved point or a changed number", () => {
    expect(figureTranslationProblem(venn.figure, { type: "venn", sets: ["क्रिकेट", "फुटबॉल"], counts: { "1": 13, "2": null, "12": 5, none: 4 } })).toMatchObject({ error: expect.stringMatching(/keep every count/) });
    const points = triangle.figure.type === "geometry" ? triangle.figure.points : [];
    expect(figureTranslationProblem(triangle.figure, { type: "geometry", points: points.map((point) => (point.name === "C" ? { ...point, x: 60 } : point)), lines: [{ from: "A", to: "B", label: "5 सेमी" }, { from: "B", to: "C" }], angles: [{ at: "B", from: "A", to: "C", label: "90°" }] })).toMatchObject({ error: expect.stringMatching(/every point name and position/) });
    expect(figureTranslationProblem(triangle.figure, { type: "geometry", points, lines: [{ from: "A", to: "B", label: "6 सेमी" }, { from: "B", to: "C" }], angles: [{ at: "B", from: "A", to: "C", label: "90°" }] })).toMatchObject({ error: expect.stringMatching(/same lines, circles, angles and numbers/) });
    expect(figureTranslationProblem(venn.figure, { type: "geometry" })).toHaveProperty("error");
  });
});
