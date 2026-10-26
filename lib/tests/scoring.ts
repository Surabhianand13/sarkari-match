// Pure scoring for a submitted attempt. Marks per question fall back to the test default;
// every wrong answer costs the test's negative marks; unanswered questions cost nothing.

export type ScorableQuestion = { id: string; section: string; subject: string; topic: string; correct: string; marks: number };
export type AnswerMap = Record<string, string | null | undefined>;

export type Bucket = { name: string; correct: number; incorrect: number; unattempted: number; score: number; maxScore: number; accuracy: number };

export type ScoreResult = {
  score: number;
  maxScore: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  attempted: number;
  accuracy: number;
  percentage: number;
  bySection: Bucket[];
  byTopic: Bucket[];
};

const round2 = (value: number) => Math.round(value * 100) / 100;

function emptyBucket(name: string): Bucket {
  return { name, correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0, accuracy: 0 };
}

export function scoreAttempt(questions: ScorableQuestion[], answers: AnswerMap, negativeMarks: number): ScoreResult {
  const sections = new Map<string, Bucket>();
  const topics = new Map<string, Bucket>();
  const total = emptyBucket("total");

  const apply = (bucket: Bucket, outcome: "correct" | "incorrect" | "unattempted", marks: number) => {
    bucket.maxScore += marks;
    if (outcome === "correct") {
      bucket.correct++;
      bucket.score += marks;
    } else if (outcome === "incorrect") {
      bucket.incorrect++;
      bucket.score -= negativeMarks;
    } else {
      bucket.unattempted++;
    }
  };

  for (const question of questions) {
    const given = answers[question.id];
    const outcome = !given ? "unattempted" : given === question.correct ? "correct" : "incorrect";
    const section = sections.get(question.section) ?? emptyBucket(question.section);
    const topic = topics.get(`${question.subject} / ${question.topic}`) ?? emptyBucket(`${question.subject} / ${question.topic}`);
    sections.set(question.section, section);
    topics.set(topic.name, topic);
    apply(total, outcome, question.marks);
    apply(section, outcome, question.marks);
    apply(topic, outcome, question.marks);
  }

  const finish = (bucket: Bucket): Bucket => {
    const attempted = bucket.correct + bucket.incorrect;
    return { ...bucket, score: round2(bucket.score), maxScore: round2(bucket.maxScore), accuracy: attempted ? round2((bucket.correct / attempted) * 100) : 0 };
  };

  const done = finish(total);
  return {
    score: done.score,
    maxScore: done.maxScore,
    correct: done.correct,
    incorrect: done.incorrect,
    unattempted: done.unattempted,
    attempted: done.correct + done.incorrect,
    accuracy: done.accuracy,
    percentage: done.maxScore ? round2((done.score / done.maxScore) * 100) : 0,
    bySection: [...sections.values()].map(finish),
    byTopic: [...topics.values()].map(finish).sort((a, b) => a.accuracy - b.accuracy)
  };
}
