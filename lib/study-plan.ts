export type WeakTopic = { subject: string; topic: string; accuracy: number; attempted: number };
export type PlanTask = { label: string; minutes: number; href: string };
export type PlanDay = { day: number; title: string; tasks: PlanTask[] };

const MIN_ATTEMPTS = 3;

// A seven-day plan built only from the learner's own results: weakest topics get practice first, then a full mock and its review.
// No model is involved, so the same results always give the same plan.
export function buildStudyPlan(weak: WeakTopic[], hasMockAttempt: boolean): PlanDay[] {
  const targets = weak.filter((item) => item.attempted >= MIN_ATTEMPTS).slice(0, 3);
  if (!targets.length) {
    return [
      { day: 1, title: "Find your starting point", tasks: [{ label: "Take the free sample test", minutes: 30, href: "/tests" }] },
      { day: 2, title: "Read your analysis", tasks: [{ label: "Review every solution and note your weak topics", minutes: 30, href: "/dashboard/tests" }] },
      { day: 3, title: "Practise", tasks: [{ label: "Adaptive practice: 10 questions", minutes: 20, href: "/practice" }] },
      { day: 4, title: "Practise", tasks: [{ label: "Adaptive practice in a second subject", minutes: 20, href: "/practice" }] },
      { day: 5, title: "Practise", tasks: [{ label: "Adaptive practice: pick a topic you found hard", minutes: 25, href: "/practice" }] },
      { day: 6, title: "Check progress", tasks: [{ label: "Take a full-length mock test", minutes: 60, href: "/tests" }] },
      { day: 7, title: "Review and reset", tasks: [{ label: "Review the mock and plan next week", minutes: 30, href: "/dashboard/progress" }] }
    ];
  }
  const [first, second = first, third = second] = targets;
  const practise = (item: WeakTopic, minutes = 25): PlanTask => ({ label: `Practise ${item.topic} (${item.subject}), currently ${item.accuracy}% accurate`, minutes, href: "/practice" });
  return [
    { day: 1, title: `Fix ${first.topic}`, tasks: [practise(first), { label: "Read the solutions for every mistake", minutes: 15, href: "/practice" }] },
    { day: 2, title: `Fix ${second.topic}`, tasks: [practise(second), { label: "Write down the rule or shortcut you missed", minutes: 10, href: "/practice" }] },
    { day: 3, title: `Fix ${third.topic}`, tasks: [practise(third), { label: `Quick recap of ${first.topic}`, minutes: 15, href: "/practice" }] },
    { day: 4, title: "Mixed practice", tasks: [{ label: `Adaptive practice in ${first.subject}`, minutes: 25, href: "/practice" }, { label: `Adaptive practice in ${second.subject}`, minutes: 25, href: "/practice" }] },
    { day: 5, title: "Full-length mock", tasks: [{ label: hasMockAttempt ? "Take the next full-length mock under the time limit" : "Take a full-length mock under the time limit", minutes: 60, href: "/tests" }] },
    { day: 6, title: "Review the mock", tasks: [{ label: "Sort each mistake: concept gap, careless error, time or guess", minutes: 30, href: "/dashboard/tests" }, { label: `Redo ${first.topic} questions you missed`, minutes: 20, href: "/practice" }] },
    { day: 7, title: "Light revision", tasks: [{ label: "Revise notes for all three weak topics", minutes: 30, href: "/practice" }, { label: "Check this page for next week's plan", minutes: 5, href: "/dashboard/progress" }] }
  ];
}
