import { makeRng, type Rng } from "./rng";
import { optionKeys, type OptionKey, type QuestionDraft } from "@/lib/tests/question-schema";

// Quantitative Aptitude questions built from exact arithmetic. The correct answer is computed, never guessed,
// so these questions need no AI to be right; the distractors model common slips.

export type Difficulty = "easy" | "moderate" | "hard";

export type TemplateQuestion = {
  draft: QuestionDraft;
  template: string;
  seed: number;
  // Same computation written as an expression, re-checked independently by the validator.
  verificationExpression: string;
};

// idea, steps and slips build the worked solution. slips[i] says which mistake distractors[i] models.
type Built = { stem: string; correct: number; distractors: number[]; slips: string[]; format: (value: number) => string; idea: string; steps: string[]; expression: string; timeSeconds: number };

const trim = (value: number) => String(Math.round(value * 100) / 100);
const inr = (value: number) => `₹${trim(value)}`;
const pct = (value: number) => `${trim(value)}%`;

function assemble(topic: string, template: string, difficulty: Difficulty, seed: number, rng: Rng, built: Built): TemplateQuestion | null {
  const values = [built.correct];
  const reasons = new Map<number, string>();
  built.distractors.forEach((candidate, index) => {
    if (values.length === 4) return;
    const rounded = Math.round(candidate * 100) / 100;
    if (!values.some((existing) => Math.abs(existing - rounded) < 1e-9) && rounded > 0 === built.correct > 0) {
      values.push(rounded);
      reasons.set(rounded, built.slips[index] ?? "does not follow from the working");
    }
  });
  // Pad with nearby values if the slip-based distractors collided.
  let pad = 1;
  while (values.length < 4 && pad < 50) {
    const candidate = Math.round((built.correct + pad * Math.max(1, Math.abs(built.correct) * 0.1)) * 100) / 100;
    if (!values.some((existing) => Math.abs(existing - candidate) < 1e-9)) {
      values.push(candidate);
      reasons.set(candidate, "is only a nearby value and does not follow from the working");
    }
    pad++;
  }
  if (values.length < 4) return null;

  const order = rng.shuffle(values);
  const options = Object.fromEntries(optionKeys.map((key, index) => [key, built.format(order[index])])) as Record<OptionKey, string>;
  const correctKey = optionKeys[order.indexOf(built.correct)];
  const others = optionKeys
    .filter((key) => key !== correctKey)
    .map((key) => `(${key}) ${options[key]} ${reasons.get(order[optionKeys.indexOf(key)]) ?? "does not follow from the working"}.`);
  const explanation = [
    `Key idea: ${built.idea}`,
    ...built.steps.map((step, index) => `Step ${index + 1}: ${step}`),
    `Answer: (${correctKey}) ${options[correctKey]}`,
    "Why not the others:",
    ...others
  ].join("\n");

  return {
    template,
    seed,
    verificationExpression: built.expression,
    draft: {
      exam: "SSC CGL",
      tier: "Tier I",
      subject: "Quantitative Aptitude",
      topic,
      difficulty,
      question: built.stem,
      options,
      correct_answer: correctKey,
      explanation,
      estimated_time_seconds: built.timeSeconds,
      source_type: "original_ai_generated"
    }
  };
}

const builders: Record<string, { topic: string; build: (rng: Rng, difficulty: Difficulty) => Built }> = {
  percentage_net_change: {
    topic: "Percentage",
    build: (rng, difficulty) => {
      const range = difficulty === "easy" ? [10, 30] : difficulty === "moderate" ? [10, 40] : [15, 60];
      const a = rng.int(range[0] / 5, range[1] / 5) * 5;
      let b = rng.int(range[0] / 5, range[1] / 5) * 5;
      if (b === a && difficulty !== "easy") b += 5;
      const net = ((100 + a) * (100 - b)) / 100 - 100;
      const word = net >= 0 ? "increase" : "decrease";
      const magnitude = Math.abs(net);
      return {
        stem: `A number is increased by ${a}% and the result is then decreased by ${b}%. What is the net percentage change in the original number?`,
        correct: magnitude === 0 ? 0.01 : magnitude,
        distractors: [Math.abs(a - b) || a, magnitude + 2, a * b / 100, Math.abs(a + b) / 2 + magnitude],
        slips: [`subtracts the two percentages (${a} - ${b}) instead of compounding them`, "adds a small amount to the correct change", `uses only the cross term ${a} x ${b} / 100`, "averages the two changes and adds the result"],
        format: (value) => (value === 0.01 ? "No change" : `${pct(value)} ${word}`),
        idea: "Successive percentage changes multiply; they do not add. A rise of x% is the factor (1 + x/100) and a fall of y% is (1 - y/100).",
        steps: [`Take the original number as 100.`, `After the ${a}% increase: 100 x ${trim((100 + a) / 100)} = ${trim(100 + a)}.`, `After the ${b}% decrease: ${trim(100 + a)} x ${trim((100 - b) / 100)} = ${trim(((100 + a) * (100 - b)) / 100)}.`, `Net change = ${trim(((100 + a) * (100 - b)) / 100)} - 100 = ${trim(net)}, so it is a ${pct(magnitude)} ${word}.`],
        expression: `${Math.abs(net)}`,
        timeSeconds: 60
      };
    }
  },
  profit_percent: {
    topic: "Profit and Loss",
    build: (rng, difficulty) => {
      const cost = rng.int(difficulty === "easy" ? 5 : 10, difficulty === "hard" ? 80 : 40) * 20;
      const profit = rng.pick(difficulty === "easy" ? [10, 20, 25, 30] : [12.5, 15, 16, 24, 35, 37.5, 40]);
      const selling = (cost * (100 + profit)) / 100;
      return {
        stem: `A shopkeeper buys an article for ${inr(cost)} and sells it for ${inr(selling)}. What is the profit percent?`,
        correct: profit,
        distractors: [profit + 5, profit - 2.5 > 0 ? profit - 2.5 : profit + 7.5, ((selling - cost) / selling) * 100, profit * 2],
        slips: ["adds 5 to the correct percent", "is a nearby value that comes from a slip in the division", "divides the profit by the selling price instead of the cost price", "doubles the correct percent"],
        format: pct,
        idea: "Profit percent = (Profit / Cost price) x 100. The base is always the cost price.",
        steps: [`Profit = Selling price - Cost price = ${selling} - ${cost} = ${trim(selling - cost)}.`, `Profit percent = (${trim(selling - cost)} / ${cost}) x 100.`, `= ${pct(profit)}.`],
        expression: `(${selling} - ${cost}) / ${cost} * 100`,
        timeSeconds: 60
      };
    }
  },
  simple_interest: {
    topic: "Simple Interest",
    build: (rng, difficulty) => {
      const principal = rng.int(5, difficulty === "hard" ? 60 : 30) * 500;
      const rate = rng.pick(difficulty === "easy" ? [5, 8, 10, 12] : [6, 7.5, 9, 12.5, 15]);
      const years = rng.int(2, difficulty === "hard" ? 7 : 5);
      const interest = (principal * rate * years) / 100;
      return {
        stem: `What is the simple interest on ${inr(principal)} for ${years} years at ${rate}% per annum?`,
        correct: interest,
        distractors: [principal * rate / 100, interest + principal * rate / 100, (principal * rate * years) / 1000, interest * 1.1],
        slips: ["is the interest for one year only, the time was not multiplied in", "adds one extra year of interest", "divides by 1000 instead of 100", "adds 10% to the correct interest"],
        format: inr,
        idea: "Simple interest = (Principal x Rate x Time) / 100, with the rate per annum and the time in years.",
        steps: [`P = ${inr(principal)}, R = ${rate}% per annum, T = ${years} years.`, `SI = ${principal} x ${rate} x ${years} / 100.`, `= ${inr(interest)}.`],
        expression: `${principal} * ${rate} * ${years} / 100`,
        timeSeconds: 50
      };
    }
  },
  time_and_work: {
    topic: "Time and Work",
    build: (rng, difficulty) => {
      const pairs: Array<[number, number]> = [];
      const limit = difficulty === "easy" ? 30 : 60;
      for (let x = 6; x <= limit; x++) for (let y = x + 1; y <= limit; y++) if ((x * y) % (x + y) === 0) pairs.push([x, y]);
      let [x, y] = rng.pick(pairs);
      if (rng.next() > 0.5) [x, y] = [y, x];
      const together = (x * y) / (x + y);
      return {
        stem: `A can complete a piece of work in ${x} days and B can complete it in ${y} days. In how many days will they complete it working together?`,
        correct: together,
        distractors: [(x + y) / 2, Math.abs(x - y), together + 2, together * 2],
        slips: ["averages the two times, which is not how combined work behaves", "subtracts the two times", "adds 2 days to the correct time", "doubles the correct time"],
        format: (value) => `${trim(value)} days`,
        idea: "Add the work done per day. If A takes x days and B takes y days, together they finish 1/x + 1/y of the work in one day.",
        steps: [`A's one day work = 1/${x}. B's one day work = 1/${y}.`, `Together in one day = 1/${x} + 1/${y} = ${x + y}/${x * y}.`, `Days needed = ${x * y}/${x + y} = ${trim(together)} days.`],
        expression: `${x} * ${y} / (${x} + ${y})`,
        timeSeconds: 70
      };
    }
  },
  ratio_larger_number: {
    topic: "Ratio and Proportion",
    build: (rng, difficulty) => {
      const a = rng.int(2, difficulty === "easy" ? 5 : 9);
      let b = rng.int(a + 1, a + (difficulty === "easy" ? 4 : 7));
      if (b === a) b += 1;
      const k = rng.int(3, difficulty === "hard" ? 25 : 15);
      const sum = k * (a + b);
      const larger = k * b;
      return {
        stem: `Two numbers are in the ratio ${a}:${b} and their sum is ${sum}. What is the larger number?`,
        correct: larger,
        distractors: [k * a, larger + k, sum - k, (sum * b) / (a + b + 1)],
        slips: ["is the smaller number, not the larger one", "adds one extra part to the larger number", "subtracts one part from the sum", "divides the sum by the wrong total of parts"],
        format: (value) => trim(value),
        idea: "In a ratio a:b the numbers are a x k and b x k for some value k. The sum of the parts gives k.",
        steps: [`Sum of the ratio parts = ${a} + ${b} = ${a + b}.`, `One part = ${sum} / ${a + b} = ${k}.`, `Larger number = ${b} x ${k} = ${larger}.`],
        expression: `${sum} / (${a} + ${b}) * ${b}`,
        timeSeconds: 55
      };
    }
  },
  train_speed: {
    topic: "Time, Speed and Distance",
    build: (rng, difficulty) => {
      const speed = rng.pick([36, 54, 72, 90, 108, 126]);
      const seconds = rng.int(5, difficulty === "hard" ? 24 : 15);
      const length = (speed * 5 * seconds) / 18;
      return {
        stem: `A train ${length} metres long crosses a signal post in ${seconds} seconds. What is the speed of the train in km/h?`,
        correct: speed,
        distractors: [length / seconds, speed + 9, (length / seconds) * 3.6 + 18, speed - 18 > 0 ? speed - 18 : speed + 27],
        slips: ["is the speed in m/s; it was not converted to km/h", "adds 9 to the correct speed", "converts correctly but then adds 18", "is lower than the correct speed by a slip in the conversion"],
        format: (value) => `${trim(value)} km/h`,
        idea: "To cross a pole or signal post, a train covers its own length. Speed = Distance / Time, and m/s is converted to km/h by multiplying by 18/5.",
        steps: [`Distance = length of the train = ${length} m, time = ${seconds} s.`, `Speed = ${length} / ${seconds} = ${trim(length / seconds)} m/s.`, `In km/h = ${trim(length / seconds)} x 18/5 = ${speed} km/h.`],
        expression: `${length} / ${seconds} * 18 / 5`,
        timeSeconds: 60
      };
    }
  },
  discount_selling_price: {
    topic: "Discount",
    build: (rng, difficulty) => {
      const marked = rng.int(8, difficulty === "hard" ? 90 : 40) * 50;
      const discount = rng.pick(difficulty === "easy" ? [10, 20, 25, 30] : [12, 15, 18, 24, 35, 40]);
      const selling = (marked * (100 - discount)) / 100;
      return {
        stem: `The marked price of a bag is ${inr(marked)}. A discount of ${discount}% is given on it. What is the selling price?`,
        correct: selling,
        distractors: [marked * discount / 100, marked + (marked * discount) / 100, (marked * (100 - discount * 2)) / 100, selling + marked * 0.05],
        slips: ["is the discount amount, not the selling price", "adds the discount to the marked price instead of subtracting it", "applies the discount twice", "adds 5% of the marked price to the correct answer"],
        format: inr,
        idea: "Selling price = Marked price - Discount, and the discount is a percent of the marked price.",
        steps: [`Discount = ${discount}% of ${marked} = ${trim((marked * discount) / 100)}.`, `Selling price = ${marked} - ${trim((marked * discount) / 100)} = ${inr(selling)}.`],
        expression: `${marked} * (100 - ${discount}) / 100`,
        timeSeconds: 45
      };
    }
  }
};

export const templateTopics = [...new Set(Object.values(builders).map((entry) => entry.topic))];

export function templatesForTopic(topic?: string) {
  return Object.entries(builders).filter(([, entry]) => !topic || entry.topic.toLowerCase() === topic.toLowerCase());
}

export function generateTemplateQuestion(templateName: string, difficulty: Difficulty, seed: number): TemplateQuestion | null {
  const entry = builders[templateName];
  if (!entry) return null;
  const rng = makeRng(seed);
  return assemble(entry.topic, templateName, difficulty, seed, rng, entry.build(rng, difficulty));
}
